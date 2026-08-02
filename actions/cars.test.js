import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDbMock } from "@/test/mocks/db";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ db: createDbMock() }));

const storageRemove = vi.fn().mockResolvedValue({ error: null });
const supabaseClient = {
  storage: {
    from: vi.fn(() => ({ remove: storageRemove })),
  },
};
vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => supabaseClient),
}));

const { auth } = await import("@clerk/nextjs/server");
const { db } = await import("@/lib/prisma");
const { createClient } = await import("@/lib/supabase");
const { cookies } = await import("next/headers");
const { deleteCar, getCars, updateCarStatus, addCar } = await import(
  "./cars"
);

function signInAsAdmin() {
  auth.mockResolvedValue({ userId: "clerk-admin" });
  db.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
}

describe("deleteCar (admin-gated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageRemove.mockResolvedValue({ error: null });
  });

  it("returns an error when the user is not signed in", async () => {
    auth.mockResolvedValue({ userId: null });

    const result = await deleteCar("car-1");

    expect(result.success).toBe(false);
    expect(db.car.delete).not.toHaveBeenCalled();
  });

  it("returns an error for a signed-in non-admin user", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });

    const result = await deleteCar("car-1");

    expect(result.success).toBe(false);
    expect(db.car.delete).not.toHaveBeenCalled();
  });

  it("returns not-found when the car does not exist", async () => {
    signInAsAdmin();
    db.car.findUnique.mockResolvedValue(null);

    const result = await deleteCar("missing");

    expect(result).toEqual({ success: false, error: "Car not found" });
  });

  it("deletes the db row and awaits cookies() before building the Supabase client", async () => {
    signInAsAdmin();
    db.car.findUnique.mockResolvedValue({
      images: ["https://x.supabase.co/storage/v1/object/public/car-images/cars/1/a.jpg"],
    });
    db.car.delete.mockResolvedValue({});

    const result = await deleteCar("car-1");

    expect(result).toEqual({ success: true });
    expect(db.car.delete).toHaveBeenCalledWith({ where: { id: "car-1" } });
    // cookies() must be awaited (Next 15) before being handed to createClient.
    expect(cookies).toHaveBeenCalled();
    expect(createClient).toHaveBeenCalled();
    const cookieStoreArg = createClient.mock.calls[0][0];
    expect(typeof cookieStoreArg.getAll).toBe("function");
    expect(storageRemove).toHaveBeenCalledWith(["cars/1/a.jpg"]);
  });

  it("still reports overall success even if storage cleanup fails", async () => {
    signInAsAdmin();
    db.car.findUnique.mockResolvedValue({
      images: ["https://x.supabase.co/storage/v1/object/public/car-images/cars/1/a.jpg"],
    });
    db.car.delete.mockResolvedValue({});
    storageRemove.mockResolvedValue({ error: new Error("boom") });

    const result = await deleteCar("car-1");

    expect(result).toEqual({ success: true });
  });
});

describe("addCar (admin-gated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a signed-in non-admin user before touching storage or the db", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });

    await expect(
      addCar({ carData: {}, images: [] })
    ).rejects.toThrow(/Admin access required/);
    expect(createClient).not.toHaveBeenCalled();
    expect(db.car.create).not.toHaveBeenCalled();
  });
});

describe("getCars (admin car list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not leak the array index into each car's wishlisted flag", async () => {
    const carsFromDb = [
      { id: "c1", price: { toString: () => "1" }, createdAt: new Date(), updatedAt: new Date() },
      { id: "c2", price: { toString: () => "2" }, createdAt: new Date(), updatedAt: new Date() },
      { id: "c3", price: { toString: () => "3" }, createdAt: new Date(), updatedAt: new Date() },
    ];
    db.car.findMany.mockResolvedValue(carsFromDb);

    const result = await getCars();

    expect(result.data.map((c) => c.wishlisted)).toEqual([false, false, false]);
  });
});

describe("updateCarStatus (admin-gated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an error for a signed-in non-admin user", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });

    const result = await updateCarStatus("car-1", { featured: true });

    expect(result.success).toBe(false);
    expect(db.car.update).not.toHaveBeenCalled();
  });

  it("only updates the fields that were provided", async () => {
    signInAsAdmin();
    db.car.update.mockResolvedValue({});

    const result = await updateCarStatus("car-1", { featured: true });

    expect(result).toEqual({ success: true });
    expect(db.car.update).toHaveBeenCalledWith({
      where: { id: "car-1" },
      data: { featured: true },
    });
  });
});

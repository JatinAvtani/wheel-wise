import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDbMock } from "@/test/mocks/db";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ db: createDbMock() }));

const { auth } = await import("@clerk/nextjs/server");
const { db } = await import("@/lib/prisma");
const { getCarById, toggleSavedCar, getCars } = await import(
  "./car-listing"
);

const sampleCar = {
  id: "car-1",
  price: { toString: () => "20000" },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("getCarById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not crash for a signed-out (anonymous) visitor", async () => {
    auth.mockResolvedValue({ userId: null });
    db.car.findUnique.mockResolvedValue(sampleCar);
    db.dealershipInfo.findFirst.mockResolvedValue(null);

    const result = await getCarById("car-1");

    expect(result.success).toBe(true);
    expect(db.testDriveBooking.findFirst).not.toHaveBeenCalled();
    expect(result.data.testDriveInfo.userTestDrive).toBeNull();
    expect(result.data.wishlisted).toBe(false);
  });

  it("returns not-found when the car does not exist", async () => {
    auth.mockResolvedValue({ userId: null });
    db.car.findUnique.mockResolvedValue(null);

    const result = await getCarById("missing-car");

    expect(result).toEqual({ success: false, error: "Car not found" });
  });

  it("includes wishlist and existing test-drive info for a signed-in user", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1" });
    db.car.findUnique.mockResolvedValue(sampleCar);
    db.userSavedCar.findUnique.mockResolvedValue({ id: "saved-1" });
    db.testDriveBooking.findFirst.mockResolvedValue({
      id: "td-1",
      status: "PENDING",
      bookingDate: new Date("2026-08-10T00:00:00.000Z"),
    });
    db.dealershipInfo.findFirst.mockResolvedValue(null);

    const result = await getCarById("car-1");

    expect(result.data.wishlisted).toBe(true);
    expect(result.data.testDriveInfo.userTestDrive).toEqual({
      id: "td-1",
      status: "PENDING",
      bookingDate: "2026-08-10T00:00:00.000Z",
    });
  });
});

describe("toggleSavedCar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the user is not signed in", async () => {
    auth.mockResolvedValue({ userId: null });

    await expect(toggleSavedCar("car-1")).rejects.toThrow(/Unauthorized/);
  });

  it("adds the car to the wishlist when not already saved", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1" });
    db.car.findUnique.mockResolvedValue({ id: "car-1" });
    db.userSavedCar.findUnique.mockResolvedValue(null);
    db.userSavedCar.create.mockResolvedValue({});

    const result = await toggleSavedCar("car-1");

    expect(result).toEqual({
      success: true,
      saved: true,
      message: "Car added to favorites",
    });
  });

  it("removes the car from the wishlist when already saved", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1" });
    db.car.findUnique.mockResolvedValue({ id: "car-1" });
    db.userSavedCar.findUnique.mockResolvedValue({ id: "existing" });
    db.userSavedCar.delete.mockResolvedValue({});

    const result = await toggleSavedCar("car-1");

    expect(result).toEqual({
      success: true,
      saved: false,
      message: "Car removed from favorites",
    });
  });
});

describe("getCars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks each car's wishlisted flag independently (no index leakage)", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1" });
    db.car.count.mockResolvedValue(2);
    db.car.findMany.mockResolvedValue([
      { ...sampleCar, id: "car-1" },
      { ...sampleCar, id: "car-2" },
      { ...sampleCar, id: "car-3" },
    ]);
    // Only car-1 is saved by this user.
    db.userSavedCar.findMany.mockResolvedValue([{ carId: "car-1" }]);

    const result = await getCars({});

    expect(result.data.map((c) => c.wishlisted)).toEqual([true, false, false]);
  });
});

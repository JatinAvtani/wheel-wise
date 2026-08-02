import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDbMock } from "@/test/mocks/db";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ db: createDbMock() }));

const { auth } = await import("@clerk/nextjs/server");
const { db } = await import("@/lib/prisma");
const { getDealershipInfo, saveWorkingHours, getUsers, updateUserRole } =
  await import("./settings");

describe("getDealershipInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when signed out", async () => {
    auth.mockResolvedValue({ userId: null });

    await expect(getDealershipInfo()).rejects.toThrow(/Unauthorized/);
  });

  it("returns the existing dealership record when one exists", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    const dealership = {
      id: "d1",
      workingHours: [],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    db.dealershipInfo.findFirst.mockResolvedValue(dealership);

    const result = await getDealershipInfo();

    expect(result.success).toBe(true);
    expect(db.dealershipInfo.create).not.toHaveBeenCalled();
  });

  it("creates a default dealership record when none exists", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.dealershipInfo.findFirst.mockResolvedValue(null);
    db.dealershipInfo.create.mockResolvedValue({
      id: "d1",
      workingHours: [],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await getDealershipInfo();

    expect(result.success).toBe(true);
    expect(db.dealershipInfo.create).toHaveBeenCalled();
  });
});

describe("saveWorkingHours (admin-gated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-admin caller and makes no writes", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });

    await expect(saveWorkingHours([])).rejects.toThrow(
      /Admin access required/
    );
    expect(db.workingHour.deleteMany).not.toHaveBeenCalled();
  });

  it("replaces working hours for an admin caller", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    db.dealershipInfo.findFirst.mockResolvedValue({ id: "d1" });
    db.workingHour.deleteMany.mockResolvedValue({});
    db.workingHour.create.mockResolvedValue({});

    const hours = [
      { dayOfWeek: "MONDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
    ];
    const result = await saveWorkingHours(hours);

    expect(result).toEqual({ success: true });
    expect(db.workingHour.deleteMany).toHaveBeenCalledWith({
      where: { dealershipId: "d1" },
    });
    expect(db.workingHour.create).toHaveBeenCalledTimes(1);
  });
});

describe("getUsers (admin-gated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-admin caller", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });

    await expect(getUsers()).rejects.toThrow(/Admin access required/);
  });

  it("returns all users for an admin caller", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    db.user.findMany.mockResolvedValue([
      {
        id: "u1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    const result = await getUsers();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});

describe("updateUserRole (admin-gated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-admin caller and makes no writes", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });

    await expect(updateUserRole("target-user", "ADMIN")).rejects.toThrow(
      /Admin access required/
    );
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("updates the target user's role for an admin caller", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    db.user.update.mockResolvedValue({});

    const result = await updateUserRole("target-user", "ADMIN");

    expect(result).toEqual({ success: true });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "target-user" },
      data: { role: "ADMIN" },
    });
  });
});

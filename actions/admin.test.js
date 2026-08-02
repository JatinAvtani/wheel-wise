import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDbMock } from "@/test/mocks/db";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ db: createDbMock() }));

const { auth } = await import("@clerk/nextjs/server");
const { db } = await import("@/lib/prisma");
const { getAdmin, updateTestDriveStatus, getDashboardData } = await import(
  "./admin"
);

describe("getAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports unauthorized when signed out", async () => {
    auth.mockResolvedValue({ userId: null });

    const result = await getAdmin();

    expect(result).toEqual({ authorized: false, reason: "not-admin" });
  });

  it("reports unauthorized for a non-admin user", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });

    const result = await getAdmin();

    expect(result).toEqual({ authorized: false, reason: "not-admin" });
  });

  it("authorizes an admin user", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    const adminUser = { id: "user-1", role: "ADMIN" };
    db.user.findUnique.mockResolvedValue(adminUser);

    const result = await getAdmin();

    expect(result).toEqual({ authorized: true, user: adminUser });
  });
});

describe("updateTestDriveStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-admin caller", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });

    await expect(
      updateTestDriveStatus("booking-1", "CONFIRMED")
    ).rejects.toThrow(/Admin access required/);
    expect(db.testDriveBooking.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid status for an admin caller", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    db.testDriveBooking.findUnique.mockResolvedValue({ id: "booking-1" });

    const result = await updateTestDriveStatus("booking-1", "BOGUS");

    expect(result).toEqual({ success: false, error: "Invalid status" });
  });

  it("updates status for an admin caller", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    db.testDriveBooking.findUnique.mockResolvedValue({ id: "booking-1" });
    db.testDriveBooking.update.mockResolvedValue({});

    const result = await updateTestDriveStatus("booking-1", "CONFIRMED");

    expect(result.success).toBe(true);
    expect(db.testDriveBooking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: { status: "CONFIRMED" },
    });
  });
});

describe("getDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Unauthorized for a non-admin caller instead of throwing", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });

    const result = await getDashboardData();

    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("computes car and test-drive stats for an admin caller", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    db.car.findMany.mockResolvedValue([
      { id: "c1", status: "AVAILABLE", featured: true },
      { id: "c2", status: "SOLD", featured: false },
    ]);
    db.testDriveBooking.findMany.mockResolvedValue([
      { id: "t1", status: "COMPLETED", carId: "c2" },
      { id: "t2", status: "PENDING", carId: "c1" },
    ]);

    const result = await getDashboardData();

    expect(result.success).toBe(true);
    expect(result.data.cars.total).toBe(2);
    expect(result.data.cars.sold).toBe(1);
    expect(result.data.testDrives.completed).toBe(1);
    expect(result.data.testDrives.conversionRate).toBe(100);
  });
});

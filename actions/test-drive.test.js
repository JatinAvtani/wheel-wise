import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDbMock } from "@/test/mocks/db";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ db: createDbMock() }));

const { auth } = await import("@clerk/nextjs/server");
const { db } = await import("@/lib/prisma");
const { bookTestDrive, cancelTestDrive, getUserTestDrives } = await import(
  "./test-drive"
);

describe("cancelTestDrive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Unauthorized when nobody is signed in", async () => {
    auth.mockResolvedValue({ userId: null });

    const result = await cancelTestDrive("booking-1");

    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("allows the booking owner to cancel their own pending booking", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });
    db.testDriveBooking.findUnique.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      status: "PENDING",
    });
    db.testDriveBooking.update.mockResolvedValue({});

    const result = await cancelTestDrive("booking-1");

    expect(result).toEqual({
      success: true,
      message: "Test drive cancelled successfully",
    });
    expect(db.testDriveBooking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: { status: "CANCELLED" },
    });
  });

  it("rejects a non-owner, non-admin user", async () => {
    auth.mockResolvedValue({ userId: "clerk-2" });
    db.user.findUnique.mockResolvedValue({ id: "user-2", role: "USER" });
    db.testDriveBooking.findUnique.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      status: "PENDING",
    });

    const result = await cancelTestDrive("booking-1");

    expect(result).toEqual({
      success: false,
      error: "Unauthorized to cancel this booking",
    });
    expect(db.testDriveBooking.update).not.toHaveBeenCalled();
  });

  it("allows an admin to cancel a booking they do not own", async () => {
    auth.mockResolvedValue({ userId: "clerk-admin" });
    db.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    db.testDriveBooking.findUnique.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      status: "PENDING",
    });
    db.testDriveBooking.update.mockResolvedValue({});

    const result = await cancelTestDrive("booking-1");

    expect(result.success).toBe(true);
  });

  it("refuses to cancel an already-cancelled booking", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });
    db.testDriveBooking.findUnique.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      status: "CANCELLED",
    });

    const result = await cancelTestDrive("booking-1");

    expect(result).toEqual({
      success: false,
      error: "Booking is already cancelled",
    });
  });

  it("refuses to cancel a completed booking", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });
    db.testDriveBooking.findUnique.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      status: "COMPLETED",
    });

    const result = await cancelTestDrive("booking-1");

    expect(result).toEqual({
      success: false,
      error: "Cannot cancel a completed booking",
    });
  });
});

describe("bookTestDrive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails when the user is not signed in", async () => {
    auth.mockResolvedValue({ userId: null });

    const result = await bookTestDrive({
      carId: "car-1",
      bookingDate: "2026-08-10",
      startTime: "10:00",
      endTime: "11:00",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/logged in/);
  });

  it("fails when the requested slot is already booked", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1" });
    db.car.findUnique.mockResolvedValue({ id: "car-1", status: "AVAILABLE" });
    db.testDriveBooking.findFirst.mockResolvedValue({ id: "existing" });

    const result = await bookTestDrive({
      carId: "car-1",
      bookingDate: "2026-08-10",
      startTime: "10:00",
      endTime: "11:00",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already booked/);
  });

  it("creates a booking on success", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1" });
    db.car.findUnique.mockResolvedValue({ id: "car-1", status: "AVAILABLE" });
    db.testDriveBooking.findFirst.mockResolvedValue(null);
    db.testDriveBooking.create.mockResolvedValue({ id: "booking-1" });

    const result = await bookTestDrive({
      carId: "car-1",
      bookingDate: "2026-08-10",
      startTime: "10:00",
      endTime: "11:00",
      notes: "test",
    });

    expect(result).toEqual({ success: true, data: { id: "booking-1" } });
  });
});

describe("getUserTestDrives", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Unauthorized when signed out", async () => {
    auth.mockResolvedValue({ userId: null });

    const result = await getUserTestDrives();

    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("serializes each booking's nested car and dates", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1" });
    db.testDriveBooking.findMany.mockResolvedValue([
      {
        id: "b1",
        carId: "car-1",
        car: { id: "car-1", price: { toString: () => "100" } },
        bookingDate: new Date("2026-08-10T00:00:00.000Z"),
        startTime: "10:00",
        endTime: "11:00",
        status: "PENDING",
        notes: null,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    ]);

    const result = await getUserTestDrives();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].car.price).toBe(100);
    expect(result.data[0].bookingDate).toBe("2026-08-10T00:00:00.000Z");
  });
});

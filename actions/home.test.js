import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDbMock } from "@/test/mocks/db";

vi.mock("@/lib/prisma", () => ({ db: createDbMock() }));
vi.mock("@/lib/arcjet", () => ({ default: { protect: vi.fn() } }));
vi.mock("@arcjet/next", () => ({ request: vi.fn() }));

const { db } = await import("@/lib/prisma");
const { getFeaturedCars } = await import("./home");

describe("getFeaturedCars", () => {
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

    const result = await getFeaturedCars();

    expect(result.map((c) => c.wishlisted)).toEqual([false, false, false]);
  });

  it("queries only featured, available cars ordered by newest", async () => {
    db.car.findMany.mockResolvedValue([]);

    await getFeaturedCars(5);

    expect(db.car.findMany).toHaveBeenCalledWith({
      where: { featured: true, status: "AVAILABLE" },
      take: 5,
      orderBy: { createdAt: "desc" },
    });
  });
});

import { describe, it, expect } from "vitest";
import { formatCurrency, serializeCarData } from "./helpers";

describe("formatCurrency", () => {
  it("formats a number as USD currency", () => {
    expect(formatCurrency(1000)).toBe("$1,000.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });
});

describe("serializeCarData", () => {
  const baseCar = {
    id: "car-1",
    make: "Toyota",
    price: { toString: () => "25000.5" },
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-02T00:00:00.000Z"),
  };

  it("converts Decimal price to a float", () => {
    const result = serializeCarData(baseCar);
    expect(result.price).toBe(25000.5);
  });

  it("defaults price to 0 when missing", () => {
    const result = serializeCarData({ ...baseCar, price: null });
    expect(result.price).toBe(0);
  });

  it("serializes createdAt/updatedAt to ISO strings", () => {
    const result = serializeCarData(baseCar);
    expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(result.updatedAt).toBe("2024-01-02T00:00:00.000Z");
  });

  it("defaults wishlisted to false", () => {
    const result = serializeCarData(baseCar);
    expect(result.wishlisted).toBe(false);
  });

  it("sets wishlisted from the second argument", () => {
    const result = serializeCarData(baseCar, true);
    expect(result.wishlisted).toBe(true);
  });

  it("does not coerce a truthy non-boolean index into a wishlisted flag it wasn't given", () => {
    // Regression guard for the `.map(serializeCarData)` index-as-wishlisted bug.
    const result = serializeCarData(baseCar, 1);
    expect(result.wishlisted).toBe(1);
  });
});

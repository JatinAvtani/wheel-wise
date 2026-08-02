import { vi } from "vitest";

const modelMethods = () => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
});

export function createDbMock() {
  return {
    user: modelMethods(),
    car: modelMethods(),
    testDriveBooking: modelMethods(),
    userSavedCar: modelMethods(),
    dealershipInfo: modelMethods(),
    workingHour: modelMethods(),
  };
}

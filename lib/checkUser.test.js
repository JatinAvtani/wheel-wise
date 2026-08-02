import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDbMock } from "@/test/mocks/db";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
  auth: vi.fn(),
}));
vi.mock("./prisma", () => ({ db: createDbMock() }));

const { currentUser, auth } = await import("@clerk/nextjs/server");
const { db } = await import("./prisma");
const { checkUser, getDbUser, requireAdmin } = await import("./checkUser");

describe("checkUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no Clerk user is signed in", async () => {
    currentUser.mockResolvedValue(null);

    const result = await checkUser();

    expect(result).toBeNull();
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns the existing db user without creating a new one", async () => {
    currentUser.mockResolvedValue({
      id: "clerk-1",
      firstName: "Jane",
      lastName: "Doe",
      imageUrl: "http://img",
      emailAddresses: [{ emailAddress: "jane@example.com" }],
    });
    const existing = { id: "db-1", clerkUserId: "clerk-1" };
    db.user.findUnique.mockResolvedValue(existing);

    const result = await checkUser();

    expect(result).toBe(existing);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("creates a new db user when none exists yet", async () => {
    currentUser.mockResolvedValue({
      id: "clerk-2",
      firstName: "Jane",
      lastName: "Doe",
      imageUrl: "http://img",
      emailAddresses: [{ emailAddress: "jane@example.com" }],
    });
    db.user.findUnique.mockResolvedValue(null);
    const created = { id: "db-2", clerkUserId: "clerk-2" };
    db.user.create.mockResolvedValue(created);

    const result = await checkUser();

    expect(db.user.create).toHaveBeenCalledWith({
      data: {
        clerkUserId: "clerk-2",
        name: "Jane Doe",
        imageUrl: "http://img",
        email: "jane@example.com",
      },
    });
    expect(result).toBe(created);
  });
});

describe("getDbUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null without querying the db when signed out", async () => {
    auth.mockResolvedValue({ userId: null });

    const result = await getDbUser();

    expect(result).toBeNull();
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("looks up the db user by clerkUserId when signed in", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    const dbUser = { id: "user-1", role: "USER" };
    db.user.findUnique.mockResolvedValue(dbUser);

    const result = await getDbUser();

    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { clerkUserId: "clerk-1" },
    });
    expect(result).toBe(dbUser);
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when signed out", async () => {
    auth.mockResolvedValue({ userId: null });

    await expect(requireAdmin()).rejects.toThrow(
      "Unauthorized: Admin access required"
    );
  });

  it("throws when the db user is not an admin", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    db.user.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });

    await expect(requireAdmin()).rejects.toThrow(
      "Unauthorized: Admin access required"
    );
  });

  it("resolves with the user when they are an admin", async () => {
    auth.mockResolvedValue({ userId: "clerk-1" });
    const adminUser = { id: "user-1", role: "ADMIN" };
    db.user.findUnique.mockResolvedValue(adminUser);

    await expect(requireAdmin()).resolves.toBe(adminUser);
  });
});

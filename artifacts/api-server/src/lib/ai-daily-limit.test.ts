import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSelect = vi.fn();
const mockSelectFrom = vi.fn(() => ({
  where: vi.fn(() => ({
    limit: vi.fn(() => []),
  })),
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return { from: mockSelectFrom };
    },
  },
  enrollmentsTable: {
    id: "id",
    userId: "user_id",
    status: "status",
    expiresAt: "expires_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: unknown[]) => ({ op: "eq", args: a })),
  and: vi.fn((...a: unknown[]) => ({ op: "and", args: a })),
  sql: vi.fn(() => "sql-fragment"),
}));

const { checkAiDailyLimit, recordAiUsage, __testing } = await import(
  "./ai-daily-limit"
);

beforeEach(() => {
  __testing.clearUsage();
  vi.clearAllMocks();
});

describe("checkAiDailyLimit", () => {
  it("allows a user with zero usage", async () => {
    const result = await checkAiDailyLimit("user-1");
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(0);
    expect(result.limit).toBe(__testing.FREE_DAILY_LIMIT);
    expect(result.remaining).toBe(__testing.FREE_DAILY_LIMIT);
  });

  it("tracks usage correctly via recordAiUsage", async () => {
    recordAiUsage("user-2");
    recordAiUsage("user-2");
    recordAiUsage("user-2");
    const result = await checkAiDailyLimit("user-2");
    expect(result.used).toBe(3);
    expect(result.remaining).toBe(__testing.FREE_DAILY_LIMIT - 3);
    expect(result.allowed).toBe(true);
  });

  it("blocks when limit is reached", async () => {
    for (let i = 0; i < __testing.FREE_DAILY_LIMIT; i++) {
      recordAiUsage("user-3");
    }
    const result = await checkAiDailyLimit("user-3");
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(__testing.FREE_DAILY_LIMIT);
    expect(result.remaining).toBe(0);
  });

  it("isolates usage between users", async () => {
    for (let i = 0; i < __testing.FREE_DAILY_LIMIT; i++) {
      recordAiUsage("user-blocked");
    }
    const blocked = await checkAiDailyLimit("user-blocked");
    expect(blocked.allowed).toBe(false);

    const other = await checkAiDailyLimit("user-fresh");
    expect(other.allowed).toBe(true);
    expect(other.used).toBe(0);
  });

  it("returns premium limit when user has active enrollment", async () => {
    mockSelectFrom.mockReturnValueOnce({
      where: vi.fn(() => ({
        limit: vi.fn(() => [{ id: "enroll-1" }]),
      })),
    });

    const result = await checkAiDailyLimit("premium-user");
    expect(result.limit).toBe(__testing.PREMIUM_DAILY_LIMIT);
    expect(result.allowed).toBe(true);
  });

  it("falls back to free limit when enrollment query fails", async () => {
    mockSelectFrom.mockImplementationOnce(() => {
      throw new Error("DB error");
    });

    const result = await checkAiDailyLimit("user-db-fail");
    expect(result.limit).toBe(__testing.FREE_DAILY_LIMIT);
    expect(result.allowed).toBe(true);
  });
});

describe("recordAiUsage", () => {
  it("increments the counter each call", async () => {
    recordAiUsage("user-inc");
    recordAiUsage("user-inc");
    const r1 = await checkAiDailyLimit("user-inc");
    expect(r1.used).toBe(2);

    recordAiUsage("user-inc");
    const r2 = await checkAiDailyLimit("user-inc");
    expect(r2.used).toBe(3);
  });
});

describe("__testing.clearUsage", () => {
  it("resets all counters", async () => {
    recordAiUsage("user-clear");
    recordAiUsage("user-clear");
    __testing.clearUsage();
    const result = await checkAiDailyLimit("user-clear");
    expect(result.used).toBe(0);
  });
});

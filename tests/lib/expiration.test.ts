import { describe, it, expect } from "vitest";
import {
  computeExpiresAt,
  VALID_EXPIRATIONS,
  expirationFromExpiresAt,
} from "@/lib/expiration";

describe("expiration utility", () => {
  it("STOR-02: VALID_EXPIRATIONS contains all expected values", () => {
    expect(VALID_EXPIRATIONS).toEqual(["1h", "1d", "1w", "1m", "never"]);
  });

  it("STOR-02: computeExpiresAt with 1h returns createdAt + 3600", () => {
    expect(computeExpiresAt(1000, "1h")).toBe(4600);
  });

  it("STOR-02: computeExpiresAt with 1d returns createdAt + 86400", () => {
    expect(computeExpiresAt(1000, "1d")).toBe(87400);
  });

  it("STOR-02: computeExpiresAt with 1w returns createdAt + 604800", () => {
    expect(computeExpiresAt(1000, "1w")).toBe(605800);
  });

  it("STOR-02: computeExpiresAt with 1m returns createdAt + 2592000", () => {
    expect(computeExpiresAt(1000, "1m")).toBe(2593000);
  });

  it("STOR-02: computeExpiresAt with never returns null", () => {
    expect(computeExpiresAt(1000, "never")).toBeNull();
  });

  it("STOR-02: computeExpiresAt with invalid value returns null", () => {
    expect(computeExpiresAt(1000, "invalid")).toBeNull();
  });
});

describe("expirationFromExpiresAt", () => {
  it("returns never for null expiresAt", () => {
    expect(expirationFromExpiresAt(1000, null)).toBe("never");
  });

  it("maps matching expiry durations back to their keys", () => {
    expect(expirationFromExpiresAt(1000, 4600)).toBe("1h");
    expect(expirationFromExpiresAt(1000, 87400)).toBe("1d");
    expect(expirationFromExpiresAt(1000, 605800)).toBe("1w");
    expect(expirationFromExpiresAt(1000, 2593000)).toBe("1m");
  });
});

import { describe, it, expect } from "vitest";
import { computeExpiresAt, VALID_EXPIRATIONS } from "@/lib/expiration";

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

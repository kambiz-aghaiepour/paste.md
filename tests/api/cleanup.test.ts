import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DELETE } from "@/app/api/cleanup/route";
import { db } from "@/lib/db";
import { pastes } from "@/lib/db/schema";
import { createPaste } from "@/lib/db/queries";
import { like } from "drizzle-orm";

// Track cleanup secret state
let originalSecret: string | undefined;

beforeEach(() => {
  originalSecret = process.env.CLEANUP_SECRET;
  process.env.CLEANUP_SECRET = "test-secret-value";
});

afterEach(() => {
  // Restore original secret state
  if (originalSecret !== undefined) {
    process.env.CLEANUP_SECRET = originalSecret;
  } else {
    delete process.env.CLEANUP_SECRET;
  }
  // Clean up test pastes
  db.delete(pastes).where(like(pastes.id, "test%")).run();
});

function makeDeleteRequest(secret?: string): Request {
  const headers: Record<string, string> = {};
  if (secret) {
    headers["Authorization"] = `Bearer ${secret}`;
  }
  return new Request("http://localhost/api/cleanup", {
    method: "DELETE",
    headers,
  });
}

describe("DELETE /api/cleanup", () => {
  it("STOR-04: returns 401 without Authorization header", async () => {
    const request = makeDeleteRequest();
    const response = await DELETE(request);

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("STOR-04: returns 401 with wrong secret", async () => {
    const request = makeDeleteRequest("wrong-secret");
    const response = await DELETE(request);

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("STOR-04: returns 503 when CLEANUP_SECRET env not set", async () => {
    delete process.env.CLEANUP_SECRET;

    const request = makeDeleteRequest("any-secret");
    const response = await DELETE(request);

    expect(response.status).toBe(503);

    const data = await response.json();
    expect(data.error).toBe("Cleanup not configured");
  });

  it("STOR-04: deletes only expired pastes and returns count", async () => {
    // Create an expired paste (expiresAt in the past)
    createPaste({
      id: "test-exp",
      content: "expired content",
      createdAt: 500,
      expiresAt: 1000,
      sizeBytes: 15,
    });

    // Create a non-expired paste (expiresAt is null)
    createPaste({
      id: "test-noe",
      content: "non-expired content",
      createdAt: 500,
      expiresAt: null,
      sizeBytes: 19,
    });

    const request = makeDeleteRequest("test-secret-value");
    const response = await DELETE(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.deleted).toBe(1);

    // Verify the expired paste is gone
    const expiredRow = db
      .select()
      .from(pastes)
      .where(like(pastes.id, "test-exp"))
      .get();
    expect(expiredRow).toBeUndefined();

    // Verify the non-expired paste remains
    const nonExpiredRow = db
      .select()
      .from(pastes)
      .where(like(pastes.id, "test-noe"))
      .get();
    expect(nonExpiredRow).toBeDefined();
    expect(nonExpiredRow!.content).toBe("non-expired content");
  });
});

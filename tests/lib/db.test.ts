import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import {
  createPaste,
  getPasteById,
  deleteExpiredPastes,
  updatePasteExpiration,
} from "@/lib/db/queries";
import { pastes } from "@/lib/db/schema";
import { like } from "drizzle-orm";

// Clean up test records after each test
afterEach(() => {
  db.delete(pastes).where(like(pastes.id, "test%")).run();
});

describe("database schema", () => {
  it("STOR-01: pastes table has correct schema including expires_at", () => {
    const columns = db.$client.pragma("table_info(pastes)") as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }>;

    expect(columns).toHaveLength(5);

    const columnMap = Object.fromEntries(columns.map((c) => [c.name, c]));

    // Verify all 5 columns exist with correct types (SQLite returns uppercase type names)
    expect(columnMap.id).toBeDefined();
    expect(columnMap.id.type.toLowerCase()).toBe("text");
    expect(columnMap.id.pk).toBe(1);

    expect(columnMap.content).toBeDefined();
    expect(columnMap.content.type.toLowerCase()).toBe("text");

    expect(columnMap.created_at).toBeDefined();
    expect(columnMap.created_at.type.toLowerCase()).toBe("integer");

    expect(columnMap.expires_at).toBeDefined();
    expect(columnMap.expires_at.type.toLowerCase()).toBe("integer");

    expect(columnMap.size_bytes).toBeDefined();
    expect(columnMap.size_bytes.type.toLowerCase()).toBe("integer");
  });

  it("STOR-01: database is in WAL mode", () => {
    const result = db.$client.pragma("journal_mode") as Array<{
      journal_mode: string;
    }>;
    expect(result[0].journal_mode).toBe("wal");
  });
});

describe("query functions", () => {
  it("CORE-04: createPaste stores and retrieves paste with valid data", () => {
    const now = Math.floor(Date.now() / 1000);
    const input = {
      id: "test1234",
      content: "test content",
      createdAt: now,
      expiresAt: null,
      sizeBytes: 12,
    };

    const created = createPaste(input);

    expect(created.id).toBe("test1234");
    expect(created.content).toBe("test content");
    expect(created.createdAt).toBe(now);
    expect(created.expiresAt).toBeNull();
    expect(created.sizeBytes).toBe(12);

    // Verify retrieval
    const retrieved = getPasteById("test1234");
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe("test1234");
    expect(retrieved!.content).toBe("test content");
    expect(retrieved!.createdAt).toBe(now);
    expect(retrieved!.expiresAt).toBeNull();
    expect(retrieved!.sizeBytes).toBe(12);
  });

  it("getPasteById returns undefined for non-existent id", () => {
    const result = getPasteById("nonexistent");
    expect(result).toBeUndefined();
  });

  it("STOR-04: deleteExpiredPastes removes expired rows and returns count", () => {
    // Create an expired paste (expiresAt in the past)
    createPaste({
      id: "test-del1",
      content: "expired",
      createdAt: 500,
      expiresAt: 1000,
      sizeBytes: 7,
    });

    // Create a non-expired paste (expiresAt is null)
    createPaste({
      id: "test-del2",
      content: "not expired",
      createdAt: 500,
      expiresAt: null,
      sizeBytes: 11,
    });

    const deletedCount = deleteExpiredPastes();
    expect(deletedCount).toBe(1);

    // Verify expired paste is gone
    expect(getPasteById("test-del1")).toBeUndefined();

    // Verify non-expired paste remains
    const remaining = getPasteById("test-del2");
    expect(remaining).toBeDefined();
    expect(remaining!.content).toBe("not expired");
  });

  it("updatePasteExpiration updates the expiry of an existing paste", () => {
    createPaste({
      id: "test-exp1",
      content: "expiry test",
      createdAt: 500,
      expiresAt: null,
      sizeBytes: 11,
    });

    const updated = updatePasteExpiration("test-exp1", 5000);
    expect(updated).toBe(true);

    const updatedPaste = getPasteById("test-exp1");
    expect(updatedPaste).toBeDefined();
    expect(updatedPaste!.expiresAt).toBe(5000);
  });

  it("updatePasteExpiration sets expiresAt to null for never", () => {
    createPaste({
      id: "test-exp2",
      content: "expiry test",
      createdAt: 500,
      expiresAt: 10000,
      sizeBytes: 11,
    });

    const updated = updatePasteExpiration("test-exp2", null);
    expect(updated).toBe(true);

    const updatedPaste = getPasteById("test-exp2");
    expect(updatedPaste).toBeDefined();
    expect(updatedPaste!.expiresAt).toBeNull();
  });

  it("updatePasteExpiration returns false for a non-existent paste", () => {
    expect(updatePasteExpiration("nonexistent", 5000)).toBe(false);
  });
});

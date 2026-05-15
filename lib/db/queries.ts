import { eq, and, or, lt, gt, isNull, isNotNull, desc } from "drizzle-orm";
import { db } from "./index";
import { pastes, type Paste, type NewPaste } from "./schema";

export function getPasteById(id: string): Paste | undefined {
  return db.select().from(pastes).where(eq(pastes.id, id)).get();
}

export function createPaste(data: NewPaste): Paste {
  return db.insert(pastes).values(data).returning().get();
}

export type PasteSummary = Pick<Paste, "id" | "createdAt" | "expiresAt" | "sizeBytes">;

export function getAllPastes(): PasteSummary[] {
  const now = Math.floor(Date.now() / 1000);
  return db
    .select({
      id: pastes.id,
      createdAt: pastes.createdAt,
      expiresAt: pastes.expiresAt,
      sizeBytes: pastes.sizeBytes,
    })
    .from(pastes)
    .where(or(isNull(pastes.expiresAt), gt(pastes.expiresAt, now)))
    .orderBy(desc(pastes.createdAt))
    .all();
}

export function deleteExpiredPastes(): number {
  const now = Math.floor(Date.now() / 1000);
  const result = db
    .delete(pastes)
    .where(and(isNotNull(pastes.expiresAt), lt(pastes.expiresAt, now)))
    .run();
  return result.changes;
}

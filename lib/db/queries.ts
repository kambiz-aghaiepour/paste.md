import { eq } from "drizzle-orm";
import { db } from "./index";
import { pastes, type Paste, type NewPaste } from "./schema";

export function getPasteById(id: string): Paste | undefined {
  return db.select().from(pastes).where(eq(pastes.id, id)).get();
}

export function createPaste(data: NewPaste): Paste {
  return db.insert(pastes).values(data).returning().get();
}

"use server";

import { revalidatePath } from "next/cache";
import {
  deletePasteById,
  updatePasteExpiration,
} from "@/lib/db/queries";
import { computeExpiresAt, VALID_EXPIRATIONS } from "@/lib/expiration";

export async function deletePasteAction(id: string): Promise<{ success: boolean }> {
  const deleted = deletePasteById(id);
  if (deleted) {
    revalidatePath("/internal/pastes");
  }
  return { success: deleted };
}

export async function updatePasteExpirationAction(
  id: string,
  expiration: string,
): Promise<{ success: boolean }> {
  if (!VALID_EXPIRATIONS.includes(expiration)) {
    return { success: false };
  }
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = computeExpiresAt(now, expiration);
  const updated = updatePasteExpiration(id, expiresAt);
  if (updated) {
    revalidatePath("/internal/pastes");
  }
  return { success: updated };
}

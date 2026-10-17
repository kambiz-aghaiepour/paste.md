"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  deletePasteById,
  renamePasteById,
  updatePasteExpiration,
} from "@/lib/db/queries";
import { computeExpiresAt, VALID_EXPIRATIONS } from "@/lib/expiration";
import { validatePasteName } from "@/lib/paste-service";
import { getSessionFromCookies, isUsernameAuthorized } from "@/lib/session";

async function requireAdmin(): Promise<void> {
  const session = await getSessionFromCookies();
  if (!session || !isUsernameAuthorized(session)) {
    redirect("/login");
  }
}

export async function deletePasteAction(id: string): Promise<{ success: boolean }> {
  await requireAdmin();
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
  await requireAdmin();
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

export async function renamePasteAction(
  id: string,
  newId: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const nameError = validatePasteName(newId);
  if (nameError) {
    return { success: false, error: nameError };
  }
  if (newId.trim() === id) {
    return { success: false, error: "New name is the same as the current one" };
  }
  const renamed = renamePasteById(id, newId.trim());
  if (!renamed) {
    return { success: false, error: "That paste name is already in use" };
  }
  revalidatePath("/internal/pastes");
  return { success: true };
}

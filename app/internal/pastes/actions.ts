"use server";

import { revalidatePath } from "next/cache";
import { deletePasteById } from "@/lib/db/queries";

export async function deletePasteAction(id: string): Promise<{ success: boolean }> {
  const deleted = deletePasteById(id);
  if (deleted) {
    revalidatePath("/internal/pastes");
  }
  return { success: deleted };
}

import { NextResponse } from "next/server";
import { deleteExpiredPastes } from "@/lib/db/queries";

export async function DELETE(request: Request) {
  const secret = process.env.CLEANUP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Cleanup not configured" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = deleteExpiredPastes();
  return NextResponse.json({ deleted });
}

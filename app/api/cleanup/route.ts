import { NextResponse } from "next/server";
import { deleteExpiredPastes } from "@/lib/db/queries";
import { getSessionUsername, isUsernameAuthorized } from "@/lib/session";

export async function DELETE(request: Request) {
  // Admin tasks require a logged-in admin session. The bearer secret remains
  // supported as a machine-to-machine alternative when configured.
  const session = getSessionUsername(request);
  const sessionOk = session !== null && isUsernameAuthorized(session);

  const secret = process.env.CLEANUP_SECRET;
  const bearerOk =
    !sessionOk &&
    secret !== undefined &&
    request.headers.get("Authorization") === `Bearer ${secret}`;

  if (!sessionOk && !bearerOk) {
    if (!secret) {
      return NextResponse.json(
        { error: "Cleanup not configured" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = deleteExpiredPastes();
  return NextResponse.json({ deleted });
}

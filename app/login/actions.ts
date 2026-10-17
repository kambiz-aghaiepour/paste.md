"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminConfig } from "@/lib/admin-config";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/session";

function safeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/internal/pastes";
}

export async function loginAction(formData: FormData) {
  const username = formData.get("username");
  const password = formData.get("password");
  const next = safeNext((formData.get("next") as string | null) ?? null);

  const config = getAdminConfig();
  const ok =
    config !== null &&
    typeof username === "string" &&
    typeof password === "string" &&
    username === config.username &&
    password === config.password;

  if (!ok) {
    redirect(next.startsWith("/") ? `/login?error=1&next=${encodeURIComponent(next)}` : "/login?error=1");
  }

  const token = createSessionToken(config.username, config.sessionSecret);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect(next);
}

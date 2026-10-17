import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getAdminConfig } from "./admin-config";

export const SESSION_COOKIE = "pm_admin_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface SessionPayload {
  u: string;
  exp: number;
}

function b64urlEncode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function b64urlDecode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf-8");
  } catch {
    return null;
  }
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(username: string, secret: string): string {
  const payload: SessionPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = b64urlEncode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifySessionToken(token: string, secret: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadPart = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);
  const expected = sign(payloadPart, secret);
  const a = Buffer.from(sigPart);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const decoded = b64urlDecode(payloadPart);
  if (!decoded) return null;
  try {
    const payload = JSON.parse(decoded) as SessionPayload;
    if (typeof payload.u !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.u;
  } catch {
    return null;
  }
}

function tokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=");
  }
  return null;
}

/**
 * Returns the authenticated admin username from the request's session cookie,
 * or null when the session is missing, invalid, or admin auth is not configured.
 */
export function getSessionUsername(request: Request | NextRequest): string | null {
  const config = getAdminConfig();
  if (!config) return null;
  const token = tokenFromCookieHeader(request.headers.get("cookie"));
  if (!token) return null;
  return verifySessionToken(token, config.sessionSecret);
}

/** Reads session state for server components (async in Next 15+). */
export async function getSessionFromCookies(): Promise<string | null> {
  const config = getAdminConfig();
  if (!config) return null;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token, config.sessionSecret);
}

export function isUsernameAuthorized(username: string): boolean {
  const config = getAdminConfig();
  return config !== null && username === config.username;
}

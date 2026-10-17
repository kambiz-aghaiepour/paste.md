import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface AdminConfig {
  username: string;
  password: string;
  sessionSecret: string;
}

const DEFAULT_PATH = join(process.cwd(), "admin.json");

let cached: AdminConfig | null | undefined;

function parseConfig(path: string): AdminConfig | null {
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8"));
    if (
      typeof raw.username === "string" &&
      raw.username.length > 0 &&
      typeof raw.password === "string" &&
      raw.password.length > 0 &&
      typeof raw.sessionSecret === "string" &&
      raw.sessionSecret.length > 0
    ) {
      return raw as AdminConfig;
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Loads the admin account configuration.
 * Lookup order: ADMIN_CONFIG_PATH env var, then ./admin.json in the app root.
 * Returns null when the config file is missing or invalid (auth disabled).
 */
export function getAdminConfig(): AdminConfig | null {
  if (cached !== undefined) return cached;
  const path = process.env.ADMIN_CONFIG_PATH ?? DEFAULT_PATH;
  cached = parseConfig(path);
  return cached;
}

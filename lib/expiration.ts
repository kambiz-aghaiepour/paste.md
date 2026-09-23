const EXPIRATION_SECONDS: Record<string, number | null> = {
  "1h": 3600,
  "1d": 86400,
  "1w": 604800,
  "1m": 2592000,
  "never": null,
};

export const VALID_EXPIRATIONS = Object.keys(EXPIRATION_SECONDS);

export function computeExpiresAt(
  createdAt: number,
  expiration: string,
): number | null {
  const seconds = EXPIRATION_SECONDS[expiration];
  if (seconds === undefined) return null;
  if (seconds === null) return null;
  return createdAt + seconds;
}

export function expirationFromExpiresAt(
  createdAt: number,
  expiresAt: number | null,
): string {
  if (expiresAt === null) return "never";
  const diff = expiresAt - createdAt;
  for (const [key, seconds] of Object.entries(EXPIRATION_SECONDS)) {
    if (seconds !== null && seconds === diff) return key;
  }
  return "never";
}

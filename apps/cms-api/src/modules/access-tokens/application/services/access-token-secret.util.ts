import { ExpiresIn } from "../dto/create-access-token.dto";
import { createHash, randomBytes } from "node:crypto";

const EXPIRES_IN_MS: Record<Exclude<ExpiresIn, "never">, number> = {
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "1m": 30 * 24 * 60 * 60_000,
  "1y": 365 * 24 * 60 * 60_000,
};

export function generateAccessTokenSecret(): { plaintext: string; hash: string } {
  const plaintext = `cms_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(plaintext).digest("hex");
  return { plaintext, hash };
}

export function resolveExpiresAt(expiresIn: ExpiresIn, now: Date = new Date()): Date | null {
  if (expiresIn === "never") {
    return null;
  }
  return new Date(now.getTime() + EXPIRES_IN_MS[expiresIn]);
}

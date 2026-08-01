const SESSION_SECRET = process.env.SESSION_SECRET ?? "abyssoftime-default-secret-key";
export const SESSION_STORAGE_KEY = "app-session";

async function importKey(secret: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function toBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromBase64Url(str: string): Uint8Array<ArrayBuffer> {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf;
}

export async function createSessionToken(): Promise<string> {
  const payload = JSON.stringify({ auth: true, iat: Date.now() });
  const key = await importKey(SESSION_SECRET);
  const encoded = new TextEncoder().encode(payload);
  const signature = await crypto.subtle.sign("HMAC", key, encoded);
  return `${toBase64Url(encoded)}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return false;
    const encodedPayload = token.slice(0, dotIdx);
    const encodedSig = token.slice(dotIdx + 1);
    const payload = fromBase64Url(encodedPayload);
    const sig = fromBase64Url(encodedSig);
    const key = await importKey(SESSION_SECRET);
    return await crypto.subtle.verify("HMAC", key, sig, payload);
  } catch {
    return false;
  }
}

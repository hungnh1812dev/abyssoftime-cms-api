import type { ICrypto } from "@/lib/crypto";

export function generateTimestampedFilename(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `data-${timestamp}.txt`;
}

export function encryptFileContent(raw: string, password: string, crypto: ICrypto): string {
  return btoa(crypto.encrypt(raw, password));
}

export function decryptFileContent(base64Content: string, password: string, crypto: ICrypto): string | null {
  try {
    const content = crypto.decrypt(atob(base64Content), password);
    return content || null;
  } catch {
    return null;
  }
}

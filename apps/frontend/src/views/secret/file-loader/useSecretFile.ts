import type { ICrypto } from "@/lib/crypto";

export function generateSecretFilename(): string {
  return `secrets-${new Date().toISOString().split("T")[0]}.txt`;
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

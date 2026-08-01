"use server";

import { createHmac, timingSafeEqual } from "crypto";

import { createSessionToken } from "@/libs/session";

type AuthResult = { error: string } | { token: string };

// Hash both values with HMAC-SHA256 before comparing so timingSafeEqual always
// receives fixed-length (32-byte) buffers — prevents timing oracle attacks.
function safeComparePasscode(input: string, expected: string): boolean {
  const key = process.env.SESSION_SECRET ?? "abyssoftime-default-secret-key";
  const inputHash = createHmac("sha256", key).update(input).digest();
  const expectedHash = createHmac("sha256", key).update(expected).digest();
  return timingSafeEqual(inputHash, expectedHash);
}

export async function verifyPasscode(_prevState: AuthResult | null, formData: FormData): Promise<AuthResult> {
  const passcode = (formData.get("passcode") as string) ?? "";
  const expected = process.env.APP_PASSCODE ?? "123456";

  if (!safeComparePasscode(passcode, expected)) {
    return { error: "Sai passcode, vui lòng thử lại." };
  }

  return { token: await createSessionToken() };
}

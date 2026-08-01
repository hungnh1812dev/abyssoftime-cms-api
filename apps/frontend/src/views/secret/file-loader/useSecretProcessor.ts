import { v4 as uuidv4 } from "uuid";

import type { ICrypto } from "@/lib/crypto";
import type { SecretEntry } from "@/views/secret/secret.types";

export function parseRawToSecretMap(raw: string, encPw: string, crypto: ICrypto): Map<string, SecretEntry> {
  const obj: SecretEntry[] = JSON.parse(raw);
  const dataMap = new Map<string, SecretEntry>();
  obj.forEach((item) => {
    const uuid = item.uuid || uuidv4();
    dataMap.set(uuid, {
      ...item,
      uuid,
      name: encPw ? crypto.decrypt(item.name, encPw) : item.name,
      email: encPw ? crypto.decrypt(item.email, encPw) : item.email,
      secret: encPw ? crypto.decrypt(item.secret, encPw) : item.secret,
      notes: item.notes ? (encPw ? crypto.decrypt(item.notes, encPw) : "") : "",
    });
  });
  return dataMap;
}

export function reEncodeSecretData(data: Map<string, SecretEntry>, encPw: string, crypto: ICrypto): string {
  const values = Array.from(data.values())
    .map((item) => ({
      ...item,
      name: encPw ? crypto.encrypt(item.name, encPw) : item.name,
      email: encPw ? crypto.encrypt(item.email, encPw) : item.email,
      secret: encPw ? crypto.encrypt(item.secret, encPw) : item.secret,
      notes: item.notes ? (encPw ? crypto.encrypt(item.notes, encPw) : "") : "",
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return JSON.stringify(values, null, 2);
}

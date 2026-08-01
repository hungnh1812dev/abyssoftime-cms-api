import { v4 as uuidv4 } from "uuid";

import type { ICrypto } from "@/lib/crypto";
import type { AccountEntry } from "@/views/account/account.types";

export function parseRawToAccountMap(raw: string, encPw: string, crypto: ICrypto): Map<string, AccountEntry> {
  const obj: AccountEntry[] = JSON.parse(raw);
  const dataMap = new Map<string, AccountEntry>();
  obj.forEach((item) => {
    const uuid = item.uuid || uuidv4();
    dataMap.set(uuid, {
      ...item,
      uuid,
      name: encPw ? crypto.decrypt(item.name, encPw) : item.name,
      password: encPw ? crypto.decrypt(item.password, encPw) : item.password,
      additionalInfo: encPw && item.additionalInfo ? crypto.decrypt(item.additionalInfo, encPw) : item.additionalInfo,
    });
  });
  return dataMap;
}

export function reEncodeAccountData(accountData: Map<string, AccountEntry>, encPw: string, crypto: ICrypto): string {
  const allAccounts = Array.from(accountData.values())
    .map(({ isModified, ...a }) => ({
      ...a,
      name: encPw ? crypto.encrypt(a.name, encPw) : a.name,
      password: encPw ? crypto.encrypt(a.password, encPw) : a.password,
      additionalInfo: encPw && a.additionalInfo ? crypto.encrypt(a.additionalInfo, encPw) : a.additionalInfo,
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
  return JSON.stringify(allAccounts, null, 2);
}

export function mergeAndSmartUpdateRaw(currentRaw: string, accountData: Map<string, AccountEntry>, encPw: string, crypto: ICrypto): string {
  const currentPreviewMap = new Map<string, AccountEntry>();
  try {
    const parsed: AccountEntry[] = JSON.parse(currentRaw);
    parsed.forEach((item) => currentPreviewMap.set(item.uuid, item));
  } catch {
    // preview parse failed → rebuild from accountData
  }

  const resultMap = new Map(currentPreviewMap);
  Array.from(resultMap.keys()).forEach((uuid) => {
    if (!accountData.has(uuid)) resultMap.delete(uuid);
  });

  const modifiedAccounts = Array.from(accountData.values()).filter((a) => a.isModified);
  modifiedAccounts.forEach((account) => {
    const { isModified, ...accountWithoutFlag } = account;
    resultMap.set(account.uuid, {
      ...accountWithoutFlag,
      name: encPw ? crypto.encrypt(account.name, encPw) : account.name,
      password: encPw ? crypto.encrypt(account.password, encPw) : account.password,
      additionalInfo: encPw && account.additionalInfo ? crypto.encrypt(account.additionalInfo, encPw) : account.additionalInfo,
    });
  });

  const sorted = Array.from(resultMap.values()).sort((a, b) => a.group.localeCompare(b.group));
  return JSON.stringify(sorted, null, 2);
}

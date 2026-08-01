import { enc } from "crypto-js";
import aes from "crypto-js/aes";

export interface ICrypto {
  encrypt(data: string, password: string): string;
  decrypt(data: string, password: string): string;
}

export const aesCrypto: ICrypto = {
  encrypt(data, password) {
    return aes.encrypt(data, password).toString();
  },
  decrypt(data, password) {
    const bytes = aes.decrypt(data, password);
    return bytes.toString(enc.Utf8);
  },
};

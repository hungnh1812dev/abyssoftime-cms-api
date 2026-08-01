export interface SecretEntry {
  uuid: string;
  key: string;
  name: string;
  email: string;
  secret: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const emptySecretEntry: SecretEntry = {
  uuid: "",
  key: "",
  name: "",
  email: "",
  secret: "",
  notes: "",
};

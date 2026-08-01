export interface AccountEntry {
  uuid: string;
  group: string;
  name: string;
  password: string;
  additionalInfo?: string;
  createdAt?: string;
  updatedAt?: string;
  isModified?: boolean;
}

export const emptyAccountEntry: AccountEntry = {
  uuid: "",
  group: "",
  name: "",
  password: "",
  additionalInfo: "",
};

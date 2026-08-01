// Account Manager — currently uses local file upload (JSON).
// When a GraphQL backend is available, use these queries/mutations.
// Note: encrypt passwords before sending to the server.

export const GET_ACCOUNTS_QUERY = /* GraphQL */ `
  query GetAccounts {
    accounts {
      uuid
      group
      name
      password
      additionalInfo
      createdAt
      updatedAt
    }
  }
`;

export const SAVE_ACCOUNT_MUTATION = /* GraphQL */ `
  mutation SaveAccount($input: AccountInput!) {
    saveAccount(input: $input) {
      uuid
      group
      name
      password
      additionalInfo
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_ACCOUNT_MUTATION = /* GraphQL */ `
  mutation DeleteAccount($uuid: String!) {
    deleteAccount(uuid: $uuid) {
      uuid
    }
  }
`;

export const BULK_SAVE_ACCOUNTS_MUTATION = /* GraphQL */ `
  mutation BulkSaveAccounts($inputs: [AccountInput!]!) {
    bulkSaveAccounts(inputs: $inputs) {
      uuid
      group
      name
      createdAt
      updatedAt
    }
  }
`;

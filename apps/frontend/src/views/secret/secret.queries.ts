// Secret Manager — currently uses local file upload (JSON).
// When a GraphQL backend is available, use these queries/mutations.
// Note: the `secret` field must be AES-256 encrypted before sending to the server.

export const GET_SECRETS_QUERY = /* GraphQL */ `
  query GetSecrets {
    secrets {
      uuid
      key
      name
      email
      secret
      notes
      createdAt
      updatedAt
    }
  }
`;

export const SAVE_SECRET_MUTATION = /* GraphQL */ `
  mutation SaveSecret($input: SecretInput!) {
    saveSecret(input: $input) {
      uuid
      key
      name
      email
      secret
      notes
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_SECRET_MUTATION = /* GraphQL */ `
  mutation DeleteSecret($uuid: String!) {
    deleteSecret(uuid: $uuid) {
      uuid
    }
  }
`;

export const BULK_SAVE_SECRETS_MUTATION = /* GraphQL */ `
  mutation BulkSaveSecrets($inputs: [SecretInput!]!) {
    bulkSaveSecrets(inputs: $inputs) {
      uuid
      key
      name
      createdAt
      updatedAt
    }
  }
`;

export const GET_CONTACT = /* GraphQL */ `
  query GetContact {
    cvContact {
      name
      address
      phone
      email
      linkedin
      github
      avatar {
        url
      }
    }
  }
`;

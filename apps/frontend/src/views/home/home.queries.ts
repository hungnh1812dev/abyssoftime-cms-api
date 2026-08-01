export const HOME_PAGE_QUERY = /* GraphQL */ `
  query GetHomePage {
    homePage {
      pages {
        href
        iconName
        title
        subtitle
        description
        tags
      }
    }
  }
`;

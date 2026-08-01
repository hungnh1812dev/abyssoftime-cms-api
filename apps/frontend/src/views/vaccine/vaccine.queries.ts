export const VACCINE_PAGE_QUERY = /* GraphQL */ `
  query GetVaccinePage {
    vaccinePage {
      groups {
        id
        disease
        vaccines {
          name
          origin
          year
          tech
          doses
          price
          protection
          pros
          cons
        }
      }
      recommended {
        disease
        vaccine
        reason
        doses
        price
        total
      }
      vnvcPackages {
        id
        name
        price
        items
      }
    }
  }
`;

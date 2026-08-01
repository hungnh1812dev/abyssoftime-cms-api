export const GET_MAIN_CV = /* GraphQL */ `
  query GetMainCv {
    cvPages(filters: { isMain: { eq: true } }) {
      documentId
      isMain
      companyName
      position
      summary {
        name
        description
      }
      skills {
        name
        items {
          category
          items {
            name
            exp
          }
        }
      }
      experiences {
        name
        items {
          company
          location
          roles {
            position
            period
            responsibilities
            techStack
            projects
          }
        }
      }
      projects {
        name
        items {
          name
          description
          techStack
          teamSize
          role
          link
          responsitoryLink
        }
      }
      education {
        name
        items {
          degree
          institution
          location
          period
          description
        }
      }
      languages {
        name
        items {
          language
          level
        }
      }
    }
  }
`;

export const GET_CV_LIST = /* GraphQL */ `
  query GetCvList {
    cvPages(filters: { isMain: { eq: false } }) {
      documentId
      companyName
    }
  }
`;

export const GET_CV_BY_DOCUMENT_ID = /* GraphQL */ `
  query GetCvByDocumentId($documentId: ID!) {
    cvPage(documentId: $documentId) {
      documentId
      isMain
      companyName
      position
      summary {
        name
        description
      }
      skills {
        name
        items {
          category
          items {
            name
            exp
          }
        }
      }
      experiences {
        name
        items {
          company
          location
          roles {
            position
            period
            responsibilities
            techStack
            projects
          }
        }
      }
      projects {
        name
        items {
          name
          description
          techStack
          teamSize
          role
          link
          responsitoryLink
        }
      }
      education {
        name
        items {
          degree
          institution
          location
          period
          description
        }
      }
      languages {
        name
        items {
          language
          level
        }
      }
    }
  }
`;

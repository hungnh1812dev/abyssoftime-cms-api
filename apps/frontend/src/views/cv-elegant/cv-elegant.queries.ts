export const GET_MAIN_CV_ELEGANT = /* GraphQL */ `
  query GetMainCvElegant {
    cvPages(filters: [{ isMain: { eq: true } }]) {
      items {
        company
        isMain
        documentId
        educations {
          degree
          description
          institution
          location
          period
        }
        experiences {
          company
          location
          roles {
            period
            position
            projects
            responsibilities
            teamSize
            techStack
          }
        }
        languages {
          language
          level
        }
        position
        projects {
          liveLink
          name
          responsibilities
          responsitoryLink
          role
          teamSize
          techStack
        }
        references {
          role
          name
          phone
        }
        skills {
          level
          skill
        }
        summary
      }
    }
  }
`;

export const GET_CV_ELEGANT_LIST = /* GraphQL */ `
  query GetCvElegantList {
    cvPages(filters: [{ isMain: { ne: true } }]) {
      items {
        documentId
        company
      }
    }
  }
`;

export const GET_CV_ELEGANT_BY_DOCUMENT_ID = /* GraphQL */ `
  query GetCvElegantByDocumentId($documentId: ID!) {
    cvPage(documentId: $documentId) {
      company
      isMain
      documentId
      educations {
        degree
        description
        institution
        location
        period
      }
      experiences {
        company
        location
        roles {
          period
          position
          projects
          responsibilities
          teamSize
          techStack
        }
      }
      languages {
        language
        level
      }
      position
      projects {
        liveLink
        name
        responsibilities
        responsitoryLink
        role
        teamSize
        techStack
      }
      references {
        role
        name
        phone
      }
      skills {
        level
        skill
      }
      summary
    }
  }
`;

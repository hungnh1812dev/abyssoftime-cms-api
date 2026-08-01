export const REACT_KNOWLEDGE_PAGE_META_QUERY = /* GraphQL */ `
  query GetReactKnowledgePageMeta {
    reactKnowledgePage {
      sections {
        id
        title
        icon
        description
        itemCount
        style {
          iconColor
          headerBg
          headerBorder
          accentBorder
          sidebarBg
          sidebarText
        }
      }
    }
  }
`;

export const REACT_KNOWLEDGE_SECTION_QUERY = /* GraphQL */ `
  query GetReactKnowledgeSection($id: String!) {
    reactKnowledgeSection(id: $id) {
      id
      title
      icon
      description
      style {
        iconColor
        headerBg
        headerBorder
        accentBorder
        sidebarBg
        sidebarText
      }
      items {
        id
        title
        summary
        tags
        body
        hookSignature
        whenToUse
        caveats
        renderPhase {
          phase
          label
          timing
        }
        codeExample {
          language
          code
          caption
          runnable
        }
        subtopics {
          title
          body
          codeExample {
            language
            code
            caption
          }
        }
      }
    }
  }
`;

export const REACT_KNOWLEDGE_PAGE_QUERY = /* GraphQL */ `
  query GetReactKnowledgePage {
    reactKnowledgePage {
      sections {
        id
        title
        icon
        description
        items {
          id
          title
          summary
          tags
          body
          hookSignature
          whenToUse
          caveats
          renderPhase {
            phase
            label
            timing
          }
          codeExample {
            language
            code
            caption
            runnable
          }
          subtopics {
            title
            body
            codeExample {
              language
              code
              caption
            }
          }
        }
      }
    }
  }
`;

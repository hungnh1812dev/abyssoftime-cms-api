export const GO_KNOWLEDGE_PAGE_META_QUERY = /* GraphQL */ `
  query GetGoKnowledgePageMeta {
    goKnowledgePage {
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

export const GO_KNOWLEDGE_SECTION_QUERY = /* GraphQL */ `
  query GetGoKnowledgeSection($id: String!) {
    goKnowledgeSection(id: $id) {
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
        codeExample {
          language
          code
          caption
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

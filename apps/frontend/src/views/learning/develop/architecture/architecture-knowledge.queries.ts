export const ARCHITECTURE_KNOWLEDGE_PAGE_META_QUERY = /* GraphQL */ `
  query GetArchitectureKnowledgePageMeta {
    architectureKnowledgePage {
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

export const ARCHITECTURE_KNOWLEDGE_SECTION_QUERY = /* GraphQL */ `
  query GetArchitectureKnowledgeSection($id: String!) {
    architectureKnowledgeSection(id: $id) {
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
      cards {
        id
        title
        subtitle
        icon
        iconColor
        isWide
        tabs {
          label
          content
        }
        content
      }
    }
  }
`;

export const GET_WORD_LIST = /* GraphQL */ `
  query GetWordList($page: Int!, $pageSize: Int!) {
    enItVocabs(pagination: { page: $page, pageSize: $pageSize }, orderBy: { id: ASC }) {
      items {
        word
        phonetics {
          ipa
          source
          audio
          syllableParts {
            text
            stressed
          }
        }
        partsOfSpeech
        meanings {
          posLabel
          en
          vi
        }
        examples {
          en
          vi
        }
        phrases {
          en
          vi
        }
        wordGroup
        searchKeywords
        synonyms
        antonyms
      }
      meta {
        pagination {
          page
          pageSize
          total
        }
      }
    }
  }
`;

export const GET_WORD_DETAIL = /* GraphQL */ `
  query GetWordDetail($word: String!) {
    enItVocabs(filters: { word: { eq: $word } }) {
      items {
        word
        phonetics {
          ipa
          source
          audio
          syllableParts {
            text
            stressed
          }
        }
        partsOfSpeech
        meanings {
          posLabel
          en
          vi
        }
        examples {
          en
          vi
        }
        phrases {
          en
          vi
        }
        wordGroup
        searchKeywords
        synonyms
        antonyms
      }
      meta {
        pagination {
          page
          pageSize
          total
        }
      }
    }
  }
`;

export const GET_WORD_GROUPS = /* GraphQL */ `
  query GetWordGroups($page: Int!, $pageSize: Int!) {
    enItVocabs(pagination: { page: $page, pageSize: $pageSize }, orderBy: { id: ASC }) {
      items {
        wordGroup
      }
      meta {
        pagination {
          page
          pageSize
          total
        }
      }
    }
  }
`;

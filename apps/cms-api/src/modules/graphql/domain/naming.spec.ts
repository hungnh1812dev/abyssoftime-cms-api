import { componentTypeName, filterTypeName, inputTypeName, listQueryName, orderByTypeName, queryName, typeName } from "./naming";

describe("naming", () => {
  describe("cv-page", () => {
    it("derives the type name", () => {
      expect(typeName("cv-page")).toBe("CvPage");
    });

    it("derives the query name", () => {
      expect(queryName("cv-page")).toBe("cvPage");
    });

    it("derives the list query name", () => {
      expect(listQueryName("cv-page")).toBe("cvPageList");
    });

    it("derives the input type name", () => {
      expect(inputTypeName("cv-page")).toBe("CvPageInput");
    });

    it("derives the filter type name", () => {
      expect(filterTypeName("cv-page")).toBe("CvPageFilter");
    });

    it("derives the orderBy type name", () => {
      expect(orderByTypeName("cv-page")).toBe("CvPageOrderBy");
    });

    it("derives a component type name", () => {
      expect(componentTypeName("cv-page", "skill")).toBe("CvPageSkill");
    });

    it("derives a component type name for an already-camelCase component name", () => {
      expect(componentTypeName("cv-page", "role")).toBe("CvPageRole");
    });
  });

  describe("en-it-vocab", () => {
    it("derives the type name", () => {
      expect(typeName("en-it-vocab")).toBe("EnItVocab");
    });

    it("derives the query name", () => {
      expect(queryName("en-it-vocab")).toBe("enItVocab");
    });

    it("derives the list query name", () => {
      expect(listQueryName("en-it-vocab")).toBe("enItVocabList");
    });

    it("derives the input type name", () => {
      expect(inputTypeName("en-it-vocab")).toBe("EnItVocabInput");
    });

    it("derives the filter type name", () => {
      expect(filterTypeName("en-it-vocab")).toBe("EnItVocabFilter");
    });

    it("derives the orderBy type name", () => {
      expect(orderByTypeName("en-it-vocab")).toBe("EnItVocabOrderBy");
    });

    it("derives a component type name for an already-camelCase component name", () => {
      expect(componentTypeName("en-it-vocab", "syllablePart")).toBe("EnItVocabSyllablePart");
    });
  });
});

import { ComponentEntity } from "../../domain/entities/component.entity";
import { IComponentRepository } from "../../domain/repositories/component.repository";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { ComponentIoService } from "./component-io.service";

describe("ComponentIoService", () => {
  const ROLE_FIELDS: FieldDefinition[] = [
    { name: "position", type: "text" },
    { name: "period", type: "text" },
  ];

  const EXPERIENCE_FIELDS: FieldDefinition[] = [
    { name: "company", type: "text" },
    { name: "location", type: "text" },
    { name: "roles", type: "component", component: "role", repeatable: true, fields: ROLE_FIELDS },
  ];

  const CONTENT_FIELDS: FieldDefinition[] = [
    { name: "position", type: "text" },
    { name: "experiences", type: "component", component: "experience", repeatable: true, fields: EXPERIENCE_FIELDS },
  ];

  function buildRepository(): jest.Mocked<IComponentRepository> {
    return {
      findByDocument: jest.fn(),
      upsertAll: jest.fn(),
      deleteByDocument: jest.fn(),
    };
  }

  describe("saveComponents", () => {
    it("recursively extracts a 3-level nested repeatable component tree, linking parentComponentId", async () => {
      const components = buildRepository();
      const service = new ComponentIoService(components);

      const data = {
        position: "Engineer",
        experiences: [
          {
            company: "Acme",
            location: "Remote",
            roles: [
              { position: "Dev", period: "2020-2021" },
              { position: "Lead", period: "2021-2022" },
            ],
          },
        ],
      };

      await service.saveComponents("cv-page", "doc-1", "draft", CONTENT_FIELDS, data);

      expect(components.upsertAll).toHaveBeenCalledTimes(2);

      const [, expPath, expDocId, expVersion, expParentId, expEntities] = components.upsertAll.mock.calls[0];
      expect(expPath).toEqual(["experience"]);
      expect(expDocId).toBe("doc-1");
      expect(expVersion).toBe("draft");
      expect(expParentId).toBeNull();
      expect(expEntities).toHaveLength(1);
      expect(expEntities[0].fields).toEqual({ company: "Acme", location: "Remote" });
      const experienceComponentId = expEntities[0].componentId;
      expect(typeof experienceComponentId).toBe("string");
      expect(experienceComponentId.length).toBeGreaterThan(0);

      const [, rolePath, roleDocId, roleVersion, roleParentId, roleEntities] = components.upsertAll.mock.calls[1];
      expect(rolePath).toEqual(["experience", "role"]);
      expect(roleDocId).toBe("doc-1");
      expect(roleVersion).toBe("draft");
      expect(roleParentId).toBe(experienceComponentId);
      expect(roleEntities).toHaveLength(2);
      expect(roleEntities[0].fields).toEqual({ position: "Dev", period: "2020-2021" });
      expect(roleEntities[1].fields).toEqual({ position: "Lead", period: "2021-2022" });
    });

    it("passes the transaction client through to every upsertAll call", async () => {
      const components = buildRepository();
      const service = new ComponentIoService(components);
      const tx = { fake: "tx" } as never;

      await service.saveComponents("cv-page", "doc-1", "draft", CONTENT_FIELDS, { experiences: [{ company: "Acme", location: "Remote", roles: [] }] }, tx);

      for (const call of components.upsertAll.mock.calls) {
        expect(call[7]).toBe(tx);
      }
    });

    it("saves an empty component list (delete-only) when the field is absent from the data", async () => {
      const components = buildRepository();
      const service = new ComponentIoService(components);

      await service.saveComponents("cv-page", "doc-1", "draft", CONTENT_FIELDS, { position: "Engineer" });

      expect(components.upsertAll).toHaveBeenCalledTimes(1);
      expect(components.upsertAll.mock.calls[0][5]).toEqual([]);
    });

    it("does nothing when the content type has no component fields", async () => {
      const components = buildRepository();
      const service = new ComponentIoService(components);

      await service.saveComponents("cv-page", "doc-1", "draft", [{ name: "position", type: "text" }], { position: "Engineer" });

      expect(components.upsertAll).not.toHaveBeenCalled();
    });
  });

  describe("hydrateComponents", () => {
    it("recursively hydrates a nested repeatable component tree, grouping children by parentComponentId, order preserved", async () => {
      const components = buildRepository();
      const service = new ComponentIoService(components);

      components.findByDocument.mockImplementation((_slug, path) => {
        if (path.join("/") === "experience") {
          return Promise.resolve([new ComponentEntity("exp-1", "doc-1", "draft", null, { company: "Acme", location: "Remote" }, {})]);
        }
        if (path.join("/") === "experience/role") {
          return Promise.resolve([
            new ComponentEntity("role-1", "doc-1", "draft", "exp-1", { position: "Dev", period: "2020-2021" }, {}),
            new ComponentEntity("role-2", "doc-1", "draft", "exp-1", { position: "Lead", period: "2021-2022" }, {}),
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await service.hydrateComponents("cv-page", "doc-1", "draft", CONTENT_FIELDS);

      expect(result).toEqual({
        experiences: [
          {
            componentId: "exp-1",
            company: "Acme",
            location: "Remote",
            roles: [
              { componentId: "role-1", position: "Dev", period: "2020-2021" },
              { componentId: "role-2", position: "Lead", period: "2021-2022" },
            ],
          },
        ],
      });
    });

    it("hydrates a non-repeatable component field as a single object, or null when absent", async () => {
      const singleFields: FieldDefinition[] = [{ name: "avatar", type: "component", component: "avatar", repeatable: false, fields: [{ name: "url", type: "text" }] }];
      const components = buildRepository();
      const service = new ComponentIoService(components);

      components.findByDocument.mockResolvedValueOnce([]);
      expect(await service.hydrateComponents("cv-page", "doc-1", "draft", singleFields)).toEqual({ avatar: null });

      components.findByDocument.mockResolvedValueOnce([new ComponentEntity("avatar-1", "doc-1", "draft", null, { url: "https://x" }, {})]);
      expect(await service.hydrateComponents("cv-page", "doc-1", "draft", singleFields)).toEqual({ avatar: { componentId: "avatar-1", url: "https://x" } });
    });

    it("fetches each component table exactly once regardless of sibling count (no N+1)", async () => {
      const components = buildRepository();
      const service = new ComponentIoService(components);

      components.findByDocument.mockImplementation((_slug, path) => {
        if (path.join("/") === "experience") {
          return Promise.resolve([
            new ComponentEntity("exp-1", "doc-1", "draft", null, { company: "Acme", location: "Remote" }, {}),
            new ComponentEntity("exp-2", "doc-1", "draft", null, { company: "Globex", location: "NY" }, {}),
          ]);
        }
        return Promise.resolve([]);
      });

      await service.hydrateComponents("cv-page", "doc-1", "draft", CONTENT_FIELDS);

      const rolePathCalls = components.findByDocument.mock.calls.filter((call) => call[1].join("/") === "experience/role");
      expect(rolePathCalls).toHaveLength(1);
    });

    it("returns an empty object when the content type has no component fields", async () => {
      const components = buildRepository();
      const service = new ComponentIoService(components);

      const result = await service.hydrateComponents("cv-page", "doc-1", "draft", [{ name: "position", type: "text" }]);

      expect(result).toEqual({});
      expect(components.findByDocument).not.toHaveBeenCalled();
    });
  });

  describe("deleteComponents", () => {
    it("cascades deepest-first across every nested component table", async () => {
      const components = buildRepository();
      const service = new ComponentIoService(components);

      await service.deleteComponents("cv-page", "doc-1", "draft", CONTENT_FIELDS);

      expect(components.deleteByDocument).toHaveBeenCalledTimes(2);
      expect(components.deleteByDocument.mock.calls[0][1]).toEqual(["experience", "role"]);
      expect(components.deleteByDocument.mock.calls[1][1]).toEqual(["experience"]);
    });

    it("passes the transaction client through to every deleteByDocument call", async () => {
      const components = buildRepository();
      const service = new ComponentIoService(components);
      const tx = { fake: "tx" } as never;

      await service.deleteComponents("cv-page", "doc-1", "draft", CONTENT_FIELDS, tx);

      for (const call of components.deleteByDocument.mock.calls) {
        expect(call[4]).toBe(tx);
      }
    });
  });
});

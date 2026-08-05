import { randomUUID } from "node:crypto";
import request from "supertest";
import { type App } from "supertest/types";

import { type INestApplication } from "@nestjs/common";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
import { ContentTypeSyncService } from "@/modules/content-type/application/sync/content-type-sync.service";
import { type ContentTypeDefinition } from "@/modules/content-type/domain/entities/content-type.entity";
import { PrismaService } from "@/prisma/application/prisma.service";

import { bootTestApp } from "./utils/app-test.util";

interface DocumentResponseBody {
  data: {
    documentId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    [fieldName: string]: unknown;
  };
}

interface BulkCreateResponseBody {
  items: DocumentResponseBody[];
}

interface BulkDeleteResponseBody {
  deleted: string[];
  failed: { documentId: string; error?: string }[];
}

const SUPER_ADMIN_REQUIRED_SLUGS = ["content_type:read", "document:read", "document:create", "document:update", "document:delete", "document:publish", "document:unpublish"];
const ADMIN_REQUIRED_SLUGS = ["content_type:read", "document:read"];

describe("Content engine (e2e)", () => {
  const runId = randomUUID().slice(0, 8);
  const modeBSlug = `e2e-mode-b-${runId}`;
  const schemaEditSlug = `e2e-schema-edit-${runId}`;

  let app: INestApplication<App>;
  let prisma: PrismaService;
  let schemaLoader: SchemaLoaderService;
  let syncService: ContentTypeSyncService;
  let realDefs: ContentTypeDefinition[];

  let superAdminToken: string;
  let readOnlyToken: string;
  let noPermToken: string;

  const createdUserIds: string[] = [];
  const pendingCleanupCvPageIds = new Set<string>();
  const pendingCleanupVocabIds = new Set<string>();

  const modeBDef = (): ContentTypeDefinition => ({
    slug: modeBSlug,
    name: "E2E Mode B",
    kind: "collection",
    draftToPublish: false,
    fields: [{ name: "title", type: "text" }],
  });

  const schemaEditDefV1 = (): ContentTypeDefinition => ({
    slug: schemaEditSlug,
    name: "E2E Schema Edit",
    kind: "collection",
    draftToPublish: false,
    fields: [
      { name: "title", type: "text" },
      { name: "note", type: "text" },
    ],
  });

  const schemaEditDefV2 = (): ContentTypeDefinition => ({
    slug: schemaEditSlug,
    name: "E2E Schema Edit",
    kind: "collection",
    draftToPublish: false,
    fields: [
      { name: "title", type: "text" },
      { name: "extra", type: "number" },
    ],
  });

  beforeAll(async () => {
    app = await bootTestApp();

    prisma = app.get(PrismaService);
    schemaLoader = app.get(SchemaLoaderService);
    syncService = app.get(ContentTypeSyncService);
    const jwtTokenService = app.get(JwtTokenService);

    realDefs = await schemaLoader.load();
    await syncService.sync([...realDefs, modeBDef(), schemaEditDefV1()]);

    // A pre-existing dev DB may have super_admin/admin roles predating the 7 permission slugs
    // this feature adds (SeedDefaultDataService only creates missing roles/permissions, it never
    // patches an existing role's permissions array). Grant the gap via a real PUT /api/v1/roles/:id
    // call, same expected pattern as the media cycle's Checkpoint 5. `role:manager` (needed to
    // call that route) is part of super_admin's original permission set, predating this feature,
    // so bootstrap every grant off super_admin's own current permissions (never the target
    // role's — admin only has `role:read`, not `role:manager`).
    const rawSuperAdminRole = await prisma.role.findUniqueOrThrow({ where: { slug: "super_admin" } });
    const bootstrapToken = jwtTokenService.signAccessToken({
      sub: "bootstrap",
      roleSlug: rawSuperAdminRole.slug,
      level: rawSuperAdminRole.level,
      permissions: rawSuperAdminRole.permissions as string[],
    });

    async function grantMissingPermissions(slug: string, requiredSlugs: string[]) {
      const role = await prisma.role.findUniqueOrThrow({ where: { slug } });
      const permissions = role.permissions as string[];
      const granted = new Set(permissions);
      const missing = requiredSlugs.filter((required) => !granted.has(required));
      if (missing.length === 0) {
        return role;
      }

      await request(app.getHttpServer())
        .put(`/api/v1/roles/${role.documentId}`)
        .set("Cookie", [`access_token=${bootstrapToken}`])
        .send({ permissions: [...permissions, ...missing] })
        .expect(200);

      return prisma.role.findUniqueOrThrow({ where: { slug } });
    }

    const superAdminRole = await grantMissingPermissions("super_admin", SUPER_ADMIN_REQUIRED_SLUGS);
    const adminRole = await grantMissingPermissions("admin", ADMIN_REQUIRED_SLUGS);
    const editorRole = await prisma.role.findUniqueOrThrow({ where: { slug: "editor" } });

    const superAdmin = await prisma.user.create({
      data: {
        email: `content-engine-e2e-super-${runId}@example.com`,
        name: "Content Engine E2E Super Admin",
        username: `ce_e2e_super_${runId}`,
        password: "not-used",
        accountType: true,
        verified: true,
        roleId: superAdminRole.documentId,
      },
    });
    createdUserIds.push(superAdmin.documentId);

    const readOnly = await prisma.user.create({
      data: {
        email: `content-engine-e2e-admin-${runId}@example.com`,
        name: "Content Engine E2E Admin",
        username: `ce_e2e_admin_${runId}`,
        password: "not-used",
        accountType: true,
        verified: true,
        roleId: adminRole.documentId,
      },
    });
    createdUserIds.push(readOnly.documentId);

    const noPerm = await prisma.user.create({
      data: {
        email: `content-engine-e2e-editor-${runId}@example.com`,
        name: "Content Engine E2E Editor",
        username: `ce_e2e_editor_${runId}`,
        password: "not-used",
        accountType: true,
        verified: true,
        roleId: editorRole.documentId,
      },
    });
    createdUserIds.push(noPerm.documentId);

    superAdminToken = jwtTokenService.signAccessToken({
      sub: superAdmin.documentId,
      roleSlug: superAdminRole.slug,
      level: superAdminRole.level,
      permissions: superAdminRole.permissions as string[],
    });
    readOnlyToken = jwtTokenService.signAccessToken({
      sub: readOnly.documentId,
      roleSlug: adminRole.slug,
      level: adminRole.level,
      permissions: adminRole.permissions as string[],
    });
    noPermToken = jwtTokenService.signAccessToken({
      sub: noPerm.documentId,
      roleSlug: editorRole.slug,
      level: editorRole.level,
      permissions: editorRole.permissions as string[],
    });
  });

  afterAll(async () => {
    if (!app) {
      return;
    }

    for (const documentId of pendingCleanupCvPageIds) {
      await request(app.getHttpServer())
        .delete(`/api/v1/documents/collection-type/cv-page/${documentId}`)
        .set("Cookie", [`access_token=${superAdminToken}`]);
    }
    for (const documentId of pendingCleanupVocabIds) {
      await request(app.getHttpServer())
        .delete(`/api/v1/documents/collection-type/en-it-vocab/${documentId}`)
        .set("Cookie", [`access_token=${superAdminToken}`]);
    }

    // Drop the throwaway content types (and their tables) via the same sync() the boot process
    // uses, keeping the two real seeds untouched.
    await syncService.sync(realDefs);

    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { documentId: { in: createdUserIds } } });
    }

    await app.close();
  });

  describe("boot sync", () => {
    it("materializes the seed content types' tables on boot", async () => {
      const cvPageTable = await prisma.$queryRawUnsafe<{ reg: string | null }[]>(`SELECT to_regclass('public.documents_cv_page')::text as reg`);
      const vocabTable = await prisma.$queryRawUnsafe<{ reg: string | null }[]>(`SELECT to_regclass('public.documents_en_it_vocab')::text as reg`);

      expect(cvPageTable[0].reg).toBe("documents_cv_page");
      expect(vocabTable[0].reg).toBe("documents_en_it_vocab");
    });

    it("lists both seeds via GET /api/v1/content-types", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/content-types")
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200);

      const slugs = (response.body as { slug: string }[]).map((contentType) => contentType.slug);
      expect(slugs).toEqual(expect.arrayContaining(["cv-page", "en-it-vocab"]));
    });
  });

  describe("mode-A full lifecycle (cv-page)", () => {
    it("walks create (draft) -> publish -> edit (modified) -> unpublish -> delete", async () => {
      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/documents/collection-type/cv-page")
        .set("Cookie", [`access_token=${superAdminToken}`])
        .send({ data: { position: "Engineer", isMain: true, company: `Acme-${runId}`, summary: "<p>Summary</p>" } })
        .expect(201);
      const documentId = (createResponse.body as DocumentResponseBody).data.documentId;
      pendingCleanupCvPageIds.add(documentId);
      expect((createResponse.body as DocumentResponseBody).data.status).toBe("draft");

      await request(app.getHttpServer()).get(`/api/v1/public/documents/collection-type/cv-page/${documentId}`).expect(404);

      await request(app.getHttpServer())
        .post(`/api/v1/documents/collection-type/cv-page/${documentId}/publish`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200, { status: "published" });

      const publicAfterPublish = await request(app.getHttpServer()).get(`/api/v1/public/documents/collection-type/cv-page/${documentId}`).expect(200);
      expect((publicAfterPublish.body as DocumentResponseBody).data.company).toBe(`Acme-${runId}`);

      const editAfterPublish = await request(app.getHttpServer())
        .get(`/api/v1/documents/collection-type/cv-page/${documentId}`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200);
      expect((editAfterPublish.body as DocumentResponseBody).data.status).toBe("published");

      await request(app.getHttpServer())
        .put(`/api/v1/documents/collection-type/cv-page/${documentId}`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .send({ data: { position: "Senior Engineer", isMain: true, company: `Acme-${runId}`, summary: "<p>Updated</p>" } })
        .expect(200);

      const editAfterUpdate = await request(app.getHttpServer())
        .get(`/api/v1/documents/collection-type/cv-page/${documentId}`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200);
      expect((editAfterUpdate.body as DocumentResponseBody).data.status).toBe("modified");
      expect((editAfterUpdate.body as DocumentResponseBody).data.position).toBe("Senior Engineer");

      const publicBeforeUnpublish = await request(app.getHttpServer()).get(`/api/v1/public/documents/collection-type/cv-page/${documentId}`).expect(200);
      expect((publicBeforeUnpublish.body as DocumentResponseBody).data.position).toBe("Engineer");

      await request(app.getHttpServer())
        .post(`/api/v1/documents/collection-type/cv-page/${documentId}/unpublish`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200, { status: "draft" });

      await request(app.getHttpServer()).get(`/api/v1/public/documents/collection-type/cv-page/${documentId}`).expect(404);

      await request(app.getHttpServer())
        .delete(`/api/v1/documents/collection-type/cv-page/${documentId}`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(204);
      pendingCleanupCvPageIds.delete(documentId);

      await request(app.getHttpServer())
        .get(`/api/v1/documents/collection-type/cv-page/${documentId}`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(404);
    });
  });

  describe("3-level component round-trip (cv-page)", () => {
    it("preserves nested repeatable components and their order through save -> publish -> read", async () => {
      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/documents/collection-type/cv-page")
        .set("Cookie", [`access_token=${superAdminToken}`])
        .send({
          data: {
            position: "Staff Engineer",
            isMain: false,
            company: `Nested-${runId}`,
            experiences: [
              {
                company: "Acme",
                location: "Remote",
                roles: [
                  { position: "Senior Engineer", period: "2022-2024", teamSize: 5, projects: "CMS", techStack: ["ts", "node"], responsibilities: "<p>Led team</p>" },
                  {
                    position: "Staff Engineer",
                    period: "2024-2026",
                    teamSize: 8,
                    projects: "CMS v2",
                    techStack: ["ts", "node", "postgres"],
                    responsibilities: "<p>Architected v2</p>",
                  },
                ],
              },
              {
                company: "Globex",
                location: "NYC",
                roles: [{ position: "Consultant", period: "2020-2022", teamSize: 2, projects: "Legacy", techStack: ["php"], responsibilities: "<p>Maintenance</p>" }],
              },
            ],
          },
        })
        .expect(201);
      const documentId = (createResponse.body as DocumentResponseBody).data.documentId;
      pendingCleanupCvPageIds.add(documentId);

      await request(app.getHttpServer())
        .post(`/api/v1/documents/collection-type/cv-page/${documentId}/publish`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200, { status: "published" });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/documents/collection-type/cv-page/${documentId}`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200);

      const experiences = (response.body as DocumentResponseBody).data.experiences as Record<string, unknown>[];
      expect(experiences).toHaveLength(2);
      expect(experiences[0].company).toBe("Acme");
      expect(experiences[1].company).toBe("Globex");

      const acmeRoles = experiences[0].roles as Record<string, unknown>[];
      expect(acmeRoles).toHaveLength(2);
      expect(acmeRoles[0].position).toBe("Senior Engineer");
      expect(acmeRoles[1].position).toBe("Staff Engineer");
      expect(acmeRoles[0].techStack).toEqual(["ts", "node"]);

      const globexRoles = experiences[1].roles as Record<string, unknown>[];
      expect(globexRoles).toHaveLength(1);
      expect(globexRoles[0].projects).toBe("Legacy");
    });
  });

  describe("cv-page update performance benchmark", () => {
    it("updates a component-heavy document and logs wall-clock duration (perf benchmark, no hard threshold)", async () => {
      const buildExperience = (offset: number, index: number) => ({
        company: `PerfCo-${offset + index}`,
        location: "Remote",
        roles: Array.from({ length: 3 }, (_, roleIndex) => ({
          position: `Role-${offset + index}-${roleIndex}`,
          period: "2022-2024",
          teamSize: 5,
          projects: "CMS",
          techStack: ["ts", "node"],
          responsibilities: "<p>Led team</p>",
        })),
      });

      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/documents/collection-type/cv-page")
        .set("Cookie", [`access_token=${superAdminToken}`])
        .send({
          data: {
            position: "Staff Engineer",
            isMain: false,
            company: `PerfBench-${runId}`,
            experiences: Array.from({ length: 5 }, (_, index) => buildExperience(0, index)),
          },
        })
        .expect(201);
      const documentId = (createResponse.body as DocumentResponseBody).data.documentId;
      pendingCleanupCvPageIds.add(documentId);

      const startedAt = Date.now();
      await request(app.getHttpServer())
        .put(`/api/v1/documents/collection-type/cv-page/${documentId}`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .send({
          data: {
            position: "Staff Engineer",
            isMain: false,
            company: `PerfBench-${runId}`,
            experiences: Array.from({ length: 5 }, (_, index) => buildExperience(100, index)),
          },
        })
        .expect(200);
      const durationMs = Date.now() - startedAt;

      console.log(`[perf] cv-page update (5 experiences x 3 roles) took ${durationMs}ms`);

      const readResponse = await request(app.getHttpServer())
        .get(`/api/v1/documents/collection-type/cv-page/${documentId}`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200);
      const experiences = (readResponse.body as DocumentResponseBody).data.experiences as Record<string, unknown>[];
      expect(experiences).toHaveLength(5);
      expect(experiences[0].company).toBe("PerfCo-100");
      const firstRoles = experiences[0].roles as Record<string, unknown>[];
      expect(firstRoles).toHaveLength(3);
    });
  });

  describe("list filter params (cv-page)", () => {
    it("filters via $contains and $eq, combines with search, and rejects invalid filters with 400", async () => {
      const filterTag = `FilterTag-${runId}`;

      async function createCvPage(position: string, isMain: boolean): Promise<string> {
        const response = await request(app.getHttpServer())
          .post("/api/v1/documents/collection-type/cv-page")
          .set("Cookie", [`access_token=${superAdminToken}`])
          .send({ data: { position, isMain, company: `${filterTag}-Co`, summary: "<p>Filter test</p>" } })
          .expect(201);
        const documentId = (response.body as DocumentResponseBody).data.documentId;
        pendingCleanupCvPageIds.add(documentId);
        return documentId;
      }

      const primaryId = await createCvPage(`${filterTag} Primary`, true);
      const secondaryId = await createCvPage(`${filterTag} Secondary`, false);
      await createCvPage(`Unrelated-${runId}`, true);

      const containsResponse = await request(app.getHttpServer())
        .get("/api/v1/documents/collection-type/cv-page")
        .query({ filters: { position: { $contains: filterTag } } })
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200);
      const containsIds = (containsResponse.body as { items: { documentId: string }[] }).items.map((item) => item.documentId);
      expect(containsIds.sort()).toEqual([primaryId, secondaryId].sort());

      const combinedResponse = await request(app.getHttpServer())
        .get("/api/v1/documents/collection-type/cv-page")
        .query({ filters: { position: { $contains: filterTag }, isMain: { $eq: "true" } } })
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200);
      const combinedIds = (combinedResponse.body as { items: { documentId: string }[] }).items.map((item) => item.documentId);
      expect(combinedIds).toEqual([primaryId]);

      const searchAndFilterResponse = await request(app.getHttpServer())
        .get("/api/v1/documents/collection-type/cv-page")
        .query({ search: filterTag, filters: { isMain: { $eq: "false" } } })
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200);
      const searchAndFilterIds = (searchAndFilterResponse.body as { items: { documentId: string }[] }).items.map((item) => item.documentId);
      expect(searchAndFilterIds).toEqual([secondaryId]);

      // $gte against a timestamp system column — confirms the string parameter correctly casts to
      // timestamptz in a real comparison (the parameterized value is never explicitly cast in
      // buildFilterWhere; this proves Postgres's implicit text->timestamptz cast holds here).
      const timestampResponse = await request(app.getHttpServer())
        .get("/api/v1/documents/collection-type/cv-page")
        .query({ filters: { position: { $contains: filterTag }, created_at: { $gte: "2020-01-01T00:00:00.000Z" } } })
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200);
      const timestampIds = (timestampResponse.body as { items: { documentId: string }[] }).items.map((item) => item.documentId);
      expect(timestampIds.sort()).toEqual([primaryId, secondaryId].sort());

      await request(app.getHttpServer())
        .get("/api/v1/documents/collection-type/cv-page")
        .query({ filters: { unknownField: { $eq: "x" } } })
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(400);

      await request(app.getHttpServer())
        .get("/api/v1/documents/collection-type/cv-page")
        .query({ filters: { isMain: { $gt: "true" } } })
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(400);
    });
  });

  describe("mode-B behavior (draftToPublish: false)", () => {
    it("is immediately public on create, and publish/unpublish return 400", async () => {
      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/documents/collection-type/${modeBSlug}`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .send({ data: { title: "Instant" } })
        .expect(201);
      const documentId = (createResponse.body as DocumentResponseBody).data.documentId;
      expect((createResponse.body as DocumentResponseBody).data.status).toBe("published");

      const publicResponse = await request(app.getHttpServer()).get(`/api/v1/public/documents/collection-type/${modeBSlug}/${documentId}`).expect(200);
      expect((publicResponse.body as DocumentResponseBody).data.title).toBe("Instant");

      await request(app.getHttpServer())
        .post(`/api/v1/documents/collection-type/${modeBSlug}/${documentId}/publish`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/documents/collection-type/${modeBSlug}/${documentId}/unpublish`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(400);
    });
  });

  describe("schema-edit data preservation", () => {
    it("preserves untouched columns and drops/adds columns after a re-sync (reboot-equivalent)", async () => {
      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/documents/collection-type/${schemaEditSlug}`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .send({ data: { title: "Keep me", note: "Drop me" } })
        .expect(201);
      const documentId = (createResponse.body as DocumentResponseBody).data.documentId;
      expect((createResponse.body as DocumentResponseBody).data.note).toBe("Drop me");

      await syncService.sync([...realDefs, modeBDef(), schemaEditDefV2()]);

      const afterEdit = await request(app.getHttpServer())
        .get(`/api/v1/documents/collection-type/${schemaEditSlug}/${documentId}`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .expect(200);
      expect((afterEdit.body as DocumentResponseBody).data.title).toBe("Keep me");
      expect((afterEdit.body as DocumentResponseBody).data.note).toBeUndefined();
      expect((afterEdit.body as DocumentResponseBody).data.extra).toBeNull();

      const newDocResponse = await request(app.getHttpServer())
        .post(`/api/v1/documents/collection-type/${schemaEditSlug}`)
        .set("Cookie", [`access_token=${superAdminToken}`])
        .send({ data: { title: "New", extra: 42 } })
        .expect(201);
      expect((newDocResponse.body as DocumentResponseBody).data.extra).toBe(42);
      expect((newDocResponse.body as DocumentResponseBody).data.note).toBeUndefined();
    });
  });

  describe("bulk create+publish and bulk delete (en-it-vocab)", () => {
    it("creates+publishes a batch, then deletes it with one bogus id (partial success, no rollback)", async () => {
      const bulkCreateResponse = await request(app.getHttpServer())
        .post("/api/v1/documents/collection-type/en-it-vocab/bulk")
        .set("Cookie", [`access_token=${superAdminToken}`])
        .send({
          items: [
            { data: { wordGroup: "Networking", word: `packet-${runId}`, partsOfSpeech: "noun" } },
            { data: { wordGroup: "Networking", word: `socket-${runId}`, partsOfSpeech: "noun" } },
            { data: { wordGroup: "Networking", word: `latency-${runId}`, partsOfSpeech: "noun" } },
          ],
        })
        .expect(201);
      const items = (bulkCreateResponse.body as BulkCreateResponseBody).items;
      expect(items).toHaveLength(3);
      for (const item of items) {
        expect(item.data.status).toBe("published");
        pendingCleanupVocabIds.add(item.data.documentId);
      }

      const bogusId = "00000000-0000-0000-0000-000000000000";
      const idsToDelete = [items[0].data.documentId, items[1].data.documentId, bogusId];

      const bulkDeleteResponse = await request(app.getHttpServer())
        .delete("/api/v1/documents/collection-type/en-it-vocab/bulk")
        .set("Cookie", [`access_token=${superAdminToken}`])
        .send({ documentIds: idsToDelete })
        .expect(200);
      const body = bulkDeleteResponse.body as BulkDeleteResponseBody;

      expect(body.deleted.sort()).toEqual([items[0].data.documentId, items[1].data.documentId].sort());
      expect(body.failed).toHaveLength(1);
      expect(body.failed[0].documentId).toBe(bogusId);
      pendingCleanupVocabIds.delete(items[0].data.documentId);
      pendingCleanupVocabIds.delete(items[1].data.documentId);
    });

    it("creates+publishes a 50-item batch and logs wall-clock duration (perf benchmark, no hard threshold)", async () => {
      const buildItem = (index: number) => ({
        data: {
          wordGroup: "Perf",
          word: `perf-word-${runId}-${index}`,
          partsOfSpeech: "noun",
          searchKeywords: `perf,benchmark,${index}`,
          phonetics: [
            {
              ipa: `/pɜːrf-${index}/`,
              source: "US",
              audio: `https://example.com/audio/${runId}-${index}.mp3`,
              syllableParts: [
                { text: "perf", stressed: true },
                { text: `${index}`, stressed: false },
              ],
            },
          ],
          meanings: [{ posLabel: "noun", en: `Perf meaning ${index}`, vi: `Nghĩa perf ${index}` }],
          examples: [{ en: `This is example ${index}.`, vi: `Đây là ví dụ ${index}.` }],
          phrases: [{ en: `perf phrase ${index}`, vi: `cụm từ perf ${index}` }],
          synonyms: `syn-${index}`,
          antonyms: `ant-${index}`,
        },
      });

      const items = Array.from({ length: 50 }, (_, index) => buildItem(index));

      const startedAt = Date.now();
      const bulkCreateResponse = await request(app.getHttpServer())
        .post("/api/v1/documents/collection-type/en-it-vocab/bulk")
        .set("Cookie", [`access_token=${superAdminToken}`])
        .send({ items })
        .expect(201);
      const durationMs = Date.now() - startedAt;

      console.log(`[perf] 50-item en-it-vocab bulk create+publish took ${durationMs}ms`);

      const responseItems = (bulkCreateResponse.body as BulkCreateResponseBody).items;
      expect(responseItems).toHaveLength(50);

      const seenWords = new Set<string>();
      for (const [index, item] of responseItems.entries()) {
        expect(item.data.status).toBe("published");
        expect(item.data.word).toBe(`perf-word-${runId}-${index}`);
        seenWords.add(item.data.word as string);
        pendingCleanupVocabIds.add(item.data.documentId);
      }
      expect(seenWords.size).toBe(50);
    });
  });

  describe("auth", () => {
    it("rejects an unauthenticated request with 401", async () => {
      await request(app.getHttpServer()).get("/api/v1/documents/collection-type/cv-page").expect(401);
    });

    it("rejects an under-permissioned request with 403", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/documents/collection-type/cv-page")
        .set("Cookie", [`access_token=${noPermToken}`])
        .expect(403);
    });

    it("rejects create for a read-only token with 403", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/documents/collection-type/cv-page")
        .set("Cookie", [`access_token=${readOnlyToken}`])
        .send({ data: { position: "X", isMain: false, company: "X" } })
        .expect(403);
    });
  });
});

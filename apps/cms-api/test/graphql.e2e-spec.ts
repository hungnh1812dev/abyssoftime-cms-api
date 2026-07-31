import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import * as path from "node:path";
import request from "supertest";
import { type App } from "supertest/types";

import { type INestApplication } from "@nestjs/common";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { CreateAccessTokenService } from "@/modules/access-tokens/application/services/create-access-token.service";
import { ACCESS_TOKEN_REPOSITORY, type IAccessTokenRepository } from "@/modules/access-tokens/domain/repositories/access-token.repository";
import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
import { ContentTypeSyncService } from "@/modules/content-type/application/sync/content-type-sync.service";
import { type ContentTypeDefinition } from "@/modules/content-type/domain/entities/content-type.entity";
import {
  createMutationName,
  inputTypeName,
  publishMutationName,
  queryName,
  saveMutationName,
  typeName,
  unpublishMutationName,
  updateMutationName,
} from "@/modules/graphql/domain/naming";
import { STORAGE_ADAPTER } from "@/modules/storage/domain/repositories/storage-adapter.repository";
import { PrismaService } from "@/prisma/application/prisma.service";

import { bootTestApp } from "./utils/app-test.util";
import { NoopStorageAdapter } from "./utils/noop-storage.adapter";

interface GraphQLErrorBody {
  message: string;
  extensions?: { code?: string };
}

interface GraphQLResponseBody {
  data: Record<string, unknown> | null;
  errors?: GraphQLErrorBody[];
}

interface DocumentResponseBody {
  data: { documentId: string; status: string; [fieldName: string]: unknown };
}

interface MediaUploadResponseBody {
  documentId: string;
}

const SUPER_ADMIN_REQUIRED_SLUGS = ["document:read", "document:create", "document:publish"];

function buildPngBuffer(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(13, 0);
  const chunkType = Buffer.from("IHDR", "ascii");
  const widthBuf = Buffer.alloc(4);
  widthBuf.writeUInt32BE(width, 0);
  const heightBuf = Buffer.alloc(4);
  heightBuf.writeUInt32BE(height, 0);
  const rest = Buffer.from([0x08, 0x02, 0x00, 0x00, 0x00]);
  return Buffer.concat([signature, length, chunkType, widthBuf, heightBuf, rest]);
}

describe("GraphQL (e2e)", () => {
  const runId = randomUUID().slice(0, 8);
  const mediaSlug = `e2e-gql-media-${runId}`;
  const mediaQueryName = queryName(mediaSlug);
  const singleSlug = `e2e-gql-single-${runId}`;
  const singleQueryName = queryName(singleSlug);
  const storage = new NoopStorageAdapter();

  let app: INestApplication<App>;
  let prisma: PrismaService;
  let schemaLoader: SchemaLoaderService;
  let syncService: ContentTypeSyncService;
  let accessTokens: IAccessTokenRepository;
  let realDefs: ContentTypeDefinition[];

  let superAdminCookie: string;
  let readScopedApiToken: string;
  let createOnlyApiToken: string;
  let updateOnlyApiToken: string;
  let deleteOnlyApiToken: string;
  let publishOnlyApiToken: string;
  let unpublishOnlyApiToken: string;

  const createdUserIds: string[] = [];
  const createdApiTokenIds: string[] = [];
  const createdMediaIds: string[] = [];
  const pendingCleanupCvPageIds = new Set<string>();
  const pendingCleanupMediaTypeIds = new Set<string>();

  // GraphQL's typeDefs are built once at boot, straight from content-types/*.json on disk
  // (SPEC.md decision #4 — never from the DB, to sidestep the sync-timing race). A throwaway
  // content type synced only via ContentTypeSyncService.sync() (DB-only, content-engine.e2e-spec's
  // own pattern) never appears in the live GraphQL schema. Proving MediaAsset resolution through
  // a real query therefore requires an actual file on disk, present before bootTestApp() runs —
  // ContentTypeSyncService's own OnApplicationBootstrap hook then syncs its table automatically.
  const mediaDefPath = path.join(process.cwd(), "content-types", `${mediaSlug}.json`);
  const mediaDefContents: ContentTypeDefinition = {
    slug: mediaSlug,
    name: "E2E GraphQL Media",
    kind: "collection",
    draftToPublish: true,
    fields: [
      { name: "title", type: "text" },
      { name: "cover", type: "media" },
    ],
  };

  const singleDefPath = path.join(process.cwd(), "content-types", `${singleSlug}.json`);
  const singleDefContents: ContentTypeDefinition = {
    slug: singleSlug,
    name: "E2E GraphQL Single",
    kind: "single",
    draftToPublish: true,
    fields: [{ name: "heroTitle", type: "text" }],
  };

  function gql(query: string, variables?: Record<string, unknown>, token?: string) {
    const req = request(app.getHttpServer()).post("/graphql").send({ query, variables });
    if (token) {
      req.set("Authorization", `Bearer ${token}`);
    }
    return req;
  }

  beforeAll(async () => {
    await writeFile(mediaDefPath, JSON.stringify(mediaDefContents, null, 2));
    await writeFile(singleDefPath, JSON.stringify(singleDefContents, null, 2));

    app = await bootTestApp((builder) => builder.overrideProvider(STORAGE_ADAPTER).useValue(storage));

    prisma = app.get(PrismaService);
    schemaLoader = app.get(SchemaLoaderService);
    syncService = app.get(ContentTypeSyncService);
    const jwtTokenService = app.get(JwtTokenService);
    const createAccessToken = app.get(CreateAccessTokenService);
    accessTokens = app.get(ACCESS_TOKEN_REPOSITORY);

    const allDefsOnDisk = await schemaLoader.load();
    realDefs = allDefsOnDisk.filter((definition) => definition.slug !== mediaSlug && definition.slug !== singleSlug);

    // Defensive, matching content-engine.e2e-spec.ts's own precedent: a pre-existing dev DB's
    // super_admin role may predate the document:* permission slugs.
    const rawSuperAdminRole = await prisma.role.findUniqueOrThrow({ where: { slug: "super_admin" } });
    const existingPermissions = new Set(rawSuperAdminRole.permissions as string[]);
    const missing = SUPER_ADMIN_REQUIRED_SLUGS.filter((slug) => !existingPermissions.has(slug));
    if (missing.length > 0) {
      await prisma.role.update({ where: { slug: "super_admin" }, data: { permissions: [...existingPermissions, ...missing] } });
    }
    const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { slug: "super_admin" } });

    const superAdminUser = await prisma.user.create({
      data: {
        email: `graphql-e2e-super-${runId}@example.com`,
        name: "GraphQL E2E Super Admin",
        username: `gql_e2e_super_${runId}`,
        password: "not-used",
        accountType: true,
        verified: true,
        roleId: superAdminRole.documentId,
      },
    });
    createdUserIds.push(superAdminUser.documentId);

    const superAdminToken = jwtTokenService.signAccessToken({
      sub: superAdminUser.documentId,
      roleSlug: superAdminRole.slug,
      level: superAdminRole.level,
      permissions: superAdminRole.permissions as string[],
    });
    superAdminCookie = `access_token=${superAdminToken}`;

    const readScoped = await createAccessToken.execute({ name: `e2e-graphql-read-${runId}`, permissions: ["document:read"], expiresIn: "1h" }, null);
    readScopedApiToken = readScoped.plaintext;
    createdApiTokenIds.push(readScoped.entity.documentId);

    // One token per mutation, scoped with exactly that mutation's required permission (never a
    // superset) — proves each resolver checks its own specific document:* slug, not "any token".
    async function createScopedToken(permission: string): Promise<string> {
      const token = await createAccessToken.execute({ name: `e2e-graphql-${permission.replace(":", "-")}-${runId}`, permissions: [permission], expiresIn: "1h" }, null);
      createdApiTokenIds.push(token.entity.documentId);
      return token.plaintext;
    }

    createOnlyApiToken = await createScopedToken("document:create");
    updateOnlyApiToken = await createScopedToken("document:update");
    deleteOnlyApiToken = await createScopedToken("document:delete");
    publishOnlyApiToken = await createScopedToken("document:publish");
    unpublishOnlyApiToken = await createScopedToken("document:unpublish");
  });

  afterAll(async () => {
    if (!app) {
      return;
    }

    for (const documentId of pendingCleanupCvPageIds) {
      await request(app.getHttpServer()).delete(`/api/v1/documents/collection-type/cv-page/${documentId}`).set("Cookie", [superAdminCookie]);
    }
    for (const documentId of pendingCleanupMediaTypeIds) {
      await request(app.getHttpServer()).delete(`/api/v1/documents/collection-type/${mediaSlug}/${documentId}`).set("Cookie", [superAdminCookie]);
    }
    if (createdMediaIds.length > 0) {
      await prisma.mediaAsset.deleteMany({ where: { documentId: { in: createdMediaIds } } });
    }

    // Remove the throwaway content types' files, then re-sync to only the real seeds — drops
    // their tables via the same sync() the boot process uses, keeping the two real seeds untouched.
    await unlink(mediaDefPath).catch(() => undefined);
    await unlink(singleDefPath).catch(() => undefined);
    await syncService.sync(realDefs);

    for (const tokenId of createdApiTokenIds) {
      await accessTokens.delete(tokenId);
    }

    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { documentId: { in: createdUserIds } } });
    }

    await app.close();
  });

  describe("single query (cv-page)", () => {
    let documentId: string;

    beforeAll(async () => {
      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/documents/collection-type/cv-page")
        .set("Cookie", [superAdminCookie])
        .send({ data: { position: `GraphQL Engineer ${runId}`, isMain: true, company: `Acme-${runId}`, summary: "<p>Summary</p>" } })
        .expect(201);
      documentId = (createResponse.body as DocumentResponseBody).data.documentId;
      pendingCleanupCvPageIds.add(documentId);

      await request(app.getHttpServer())
        .post(`/api/v1/documents/collection-type/cv-page/${documentId}/publish`)
        .set("Cookie", [superAdminCookie])
        .expect(200, { status: "published" });
    });

    it("rejects a published-data query with no token, UNAUTHENTICATED", async () => {
      const response = await gql(`{ cvPage(Id: "${documentId}") { position company } }`).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.data).toEqual({ cvPage: null });
      expect(body.errors?.[0].extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("returns the published document for a document:read-scoped token", async () => {
      const response = await gql(`{ cvPage(Id: "${documentId}") { position company } }`, undefined, readScopedApiToken).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.errors).toBeUndefined();
      expect(body.data).toEqual({ cvPage: { position: `GraphQL Engineer ${runId}`, company: `Acme-${runId}` } });
    });

    it("returns null (not a GraphQL error) for a nonexistent Id", async () => {
      const response = await gql(`{ cvPage(Id: "${randomUUID()}") { position } }`, undefined, readScopedApiToken).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.errors).toBeUndefined();
      expect(body.data).toEqual({ cvPage: null });
    });

    it("rejects a status: draft query with no token, UNAUTHENTICATED", async () => {
      const response = await gql(`{ cvPage(Id: "${documentId}", status: "draft") { position } }`).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.data).toEqual({ cvPage: null });
      expect(body.errors?.[0].extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("returns the edit-view document for a document:read-scoped token", async () => {
      const response = await gql(`{ cvPage(Id: "${documentId}", status: "draft") { position } }`, undefined, readScopedApiToken).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.errors).toBeUndefined();
      expect(body.data).toEqual({ cvPage: { position: `GraphQL Engineer ${runId}` } });
    });
  });

  describe("list query (cv-page)", () => {
    const filterTag = `GqlList-${runId}`;

    beforeAll(async () => {
      async function createAndPublish(position: string, isMain: boolean): Promise<string> {
        const createResponse = await request(app.getHttpServer())
          .post("/api/v1/documents/collection-type/cv-page")
          .set("Cookie", [superAdminCookie])
          .send({ data: { position, isMain, company: `${filterTag}-Co`, summary: "<p>List test</p>" } })
          .expect(201);
        const documentId = (createResponse.body as DocumentResponseBody).data.documentId;
        pendingCleanupCvPageIds.add(documentId);

        await request(app.getHttpServer()).post(`/api/v1/documents/collection-type/cv-page/${documentId}/publish`).set("Cookie", [superAdminCookie]).expect(200);
        return documentId;
      }

      await createAndPublish(`${filterTag} Primary`, true);
      await createAndPublish(`${filterTag} Secondary`, false);
    });

    it("rejects a list query with no token, UNAUTHENTICATED", async () => {
      const response = await gql(`{ cvPageList(size: 1) { position } }`).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.data).toBeNull();
      expect(body.errors?.[0].extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("filters, orders, and paginates published rows for a document:read-scoped token", async () => {
      const query = `
        query($where: CvPageFilter, $orderBy: CvPageOrderBy) {
          cvPageList(where: $where, orderBy: $orderBy, start: 0, size: 10) { position isMain }
        }
      `;
      const response = await gql(query, { where: { company: { eq: `${filterTag}-Co` } }, orderBy: { position: "ASC" } }, readScopedApiToken).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.errors).toBeUndefined();
      const items = (body.data as { cvPageList: { position: string; isMain: boolean }[] }).cvPageList;
      expect(items).toEqual([
        { position: `${filterTag} Primary`, isMain: true },
        { position: `${filterTag} Secondary`, isMain: false },
      ]);
    });
  });

  describe("nested component read, 3 levels deep (cv-page)", () => {
    let documentId: string;

    beforeAll(async () => {
      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/documents/collection-type/cv-page")
        .set("Cookie", [superAdminCookie])
        .send({
          data: {
            position: `Nested ${runId}`,
            isMain: false,
            company: `NestedCo-${runId}`,
            experiences: [
              {
                company: "Acme",
                location: "Remote",
                roles: [{ position: "Senior Engineer", period: "2022-2024", teamSize: 5, projects: "CMS", techStack: ["ts", "node"], responsibilities: "<p>Led team</p>" }],
              },
            ],
          },
        })
        .expect(201);
      documentId = (createResponse.body as DocumentResponseBody).data.documentId;
      pendingCleanupCvPageIds.add(documentId);

      await request(app.getHttpServer()).post(`/api/v1/documents/collection-type/cv-page/${documentId}/publish`).set("Cookie", [superAdminCookie]).expect(200);
    });

    it("resolves nested repeatable components at every level, with a JSON-typed field returning a real array", async () => {
      const query = `{
        cvPage(Id: "${documentId}") {
          position
          experiences {
            company
            location
            roles {
              position
              techStack
            }
          }
        }
      }`;
      const response = await gql(query, undefined, readScopedApiToken).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.errors).toBeUndefined();
      expect(body.data).toEqual({
        cvPage: {
          position: `Nested ${runId}`,
          experiences: [
            {
              company: "Acme",
              location: "Remote",
              roles: [{ position: "Senior Engineer", techStack: ["ts", "node"] }],
            },
          ],
        },
      });
    });
  });

  describe("media field resolution (throwaway media-bearing content type)", () => {
    let documentId: string;
    let mediaDocumentId: string;

    beforeAll(async () => {
      const uploadResponse = await request(app.getHttpServer())
        .post("/api/v1/media/upload")
        .set("Cookie", [superAdminCookie])
        .attach("file", buildPngBuffer(400, 300), "cover.png")
        .expect(201);
      mediaDocumentId = (uploadResponse.body as MediaUploadResponseBody).documentId;
      createdMediaIds.push(mediaDocumentId);

      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/documents/collection-type/${mediaSlug}`)
        .set("Cookie", [superAdminCookie])
        .send({ data: { title: `Media doc ${runId}`, cover: mediaDocumentId } })
        .expect(201);
      documentId = (createResponse.body as DocumentResponseBody).data.documentId;
      pendingCleanupMediaTypeIds.add(documentId);

      await request(app.getHttpServer()).post(`/api/v1/documents/collection-type/${mediaSlug}/${documentId}/publish`).set("Cookie", [superAdminCookie]).expect(200);
    });

    it("resolves the media-typed field's FK to the full MediaAsset", async () => {
      const query = `{
        ${mediaQueryName}(Id: "${documentId}") {
          title
          cover { documentId url thumbnailUrl fileName width height }
        }
      }`;
      const response = await gql(query, undefined, readScopedApiToken).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.errors).toBeUndefined();
      const result = (
        body.data as Record<string, { title: string; cover: { documentId: string; url: string; thumbnailUrl: string; fileName: string; width: number; height: number } }>
      )[mediaQueryName];
      expect(result.title).toBe(`Media doc ${runId}`);
      expect(result.cover).toMatchObject({ documentId: mediaDocumentId, fileName: "cover.png", width: 400, height: 300 });
      expect(typeof result.cover.url).toBe("string");
      expect(typeof result.cover.thumbnailUrl).toBe("string");
    });

    it("resolves a null media FK to null, never an error", async () => {
      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/documents/collection-type/${mediaSlug}`)
        .set("Cookie", [superAdminCookie])
        .send({ data: { title: `No cover ${runId}` } })
        .expect(201);
      const noCoverDocumentId = (createResponse.body as DocumentResponseBody).data.documentId;
      pendingCleanupMediaTypeIds.add(noCoverDocumentId);

      await request(app.getHttpServer()).post(`/api/v1/documents/collection-type/${mediaSlug}/${noCoverDocumentId}/publish`).set("Cookie", [superAdminCookie]).expect(200);

      const response = await gql(`{ ${mediaQueryName}(Id: "${noCoverDocumentId}") { title cover { documentId } } }`, undefined, readScopedApiToken).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.errors).toBeUndefined();
      expect(body.data).toEqual({ [mediaQueryName]: { title: `No cover ${runId}`, cover: null } });
    });
  });

  describe("mutations (cv-page)", () => {
    it("round-trips a full lifecycle — create, update, publish, unpublish, delete — each mutation using a token scoped with exactly its required permission", async () => {
      const createResult = await gql(
        `mutation($data: CvPageInput!) {
          createCvPage(data: $data) {
            documentId position isMain company
            experiences { company location roles { position techStack } }
          }
        }`,
        {
          data: {
            position: `Mutation Engineer ${runId}`,
            isMain: true,
            company: `MutationCo-${runId}`,
            summary: "<p>Summary</p>",
            experiences: [
              {
                company: "Acme",
                location: "Remote",
                roles: [{ position: "Engineer", period: "2023", teamSize: 3, projects: "CMS", techStack: ["ts", "graphql"], responsibilities: "<p>Built things</p>" }],
              },
            ],
          },
        },
        createOnlyApiToken,
      ).expect(200);
      const createBody = createResult.body as GraphQLResponseBody;
      expect(createBody.errors).toBeUndefined();
      const created = (createBody.data as { createCvPage: Record<string, unknown> }).createCvPage;
      const documentId = created.documentId as string;
      pendingCleanupCvPageIds.add(documentId);
      expect(created).toMatchObject({
        position: `Mutation Engineer ${runId}`,
        isMain: true,
        company: `MutationCo-${runId}`,
        experiences: [{ company: "Acme", location: "Remote", roles: [{ position: "Engineer", techStack: ["ts", "graphql"] }] }],
      });

      const updateResult = await gql(
        `mutation($Id: ID!, $data: CvPageInput!) { updateCvPage(Id: $Id, data: $data) { documentId company } }`,
        { Id: documentId, data: { position: `Mutation Engineer ${runId}`, isMain: true, company: `UpdatedCo-${runId}`, summary: "<p>Summary</p>" } },
        updateOnlyApiToken,
      ).expect(200);
      const updateBody = updateResult.body as GraphQLResponseBody;
      expect(updateBody.errors).toBeUndefined();
      expect(updateBody.data).toEqual({ updateCvPage: { documentId, company: `UpdatedCo-${runId}` } });

      const publishResult = await gql(`mutation($Id: ID!) { publishCvPage(Id: $Id) { documentId company } }`, { Id: documentId }, publishOnlyApiToken).expect(200);
      const publishBody = publishResult.body as GraphQLResponseBody;
      expect(publishBody.errors).toBeUndefined();
      expect(publishBody.data).toEqual({ publishCvPage: { documentId, company: `UpdatedCo-${runId}` } });

      const publicReadAfterPublish = await gql(`{ cvPage(Id: "${documentId}") { company } }`, undefined, readScopedApiToken).expect(200);
      expect((publicReadAfterPublish.body as GraphQLResponseBody).data).toEqual({ cvPage: { company: `UpdatedCo-${runId}` } });

      const unpublishResult = await gql(`mutation($Id: ID!) { unpublishCvPage(Id: $Id) { documentId company } }`, { Id: documentId }, unpublishOnlyApiToken).expect(200);
      const unpublishBody = unpublishResult.body as GraphQLResponseBody;
      expect(unpublishBody.errors).toBeUndefined();
      expect(unpublishBody.data).toEqual({ unpublishCvPage: { documentId, company: `UpdatedCo-${runId}` } });

      const publicReadAfterUnpublish = await gql(`{ cvPage(Id: "${documentId}") { company } }`, undefined, readScopedApiToken).expect(200);
      expect((publicReadAfterUnpublish.body as GraphQLResponseBody).data).toEqual({ cvPage: null });

      const deleteResult = await gql(`mutation($Id: ID!) { deleteCvPage(Id: $Id) }`, { Id: documentId }, deleteOnlyApiToken).expect(200);
      const deleteBody = deleteResult.body as GraphQLResponseBody;
      expect(deleteBody.errors).toBeUndefined();
      expect(deleteBody.data).toEqual({ deleteCvPage: true });
      pendingCleanupCvPageIds.delete(documentId);

      const draftReadAfterDelete = await gql(`{ cvPage(Id: "${documentId}", status: "draft") { company } }`, undefined, readScopedApiToken).expect(200);
      expect((draftReadAfterDelete.body as GraphQLResponseBody).data).toEqual({ cvPage: null });
    });

    const permissionDeniedCases: { mutationName: string; query: string; variables: Record<string, unknown> }[] = [
      { mutationName: "createCvPage", query: `mutation($data: CvPageInput!) { createCvPage(data: $data) { documentId } }`, variables: { data: { position: "X" } } },
      {
        mutationName: "updateCvPage",
        query: `mutation($Id: ID!, $data: CvPageInput!) { updateCvPage(Id: $Id, data: $data) { documentId } }`,
        variables: { Id: randomUUID(), data: {} },
      },
      { mutationName: "deleteCvPage", query: `mutation($Id: ID!) { deleteCvPage(Id: $Id) }`, variables: { Id: randomUUID() } },
      { mutationName: "publishCvPage", query: `mutation($Id: ID!) { publishCvPage(Id: $Id) { documentId } }`, variables: { Id: randomUUID() } },
      { mutationName: "unpublishCvPage", query: `mutation($Id: ID!) { unpublishCvPage(Id: $Id) { documentId } }`, variables: { Id: randomUUID() } },
    ];

    it.each(permissionDeniedCases)("$mutationName rejects a wrongly-scoped token with FORBIDDEN, never executing the mutation", async ({ query, variables }) => {
      const response = await gql(query, variables, readScopedApiToken).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.data).toBeNull();
      expect(body.errors?.[0].extensions?.code).toBe("FORBIDDEN");
    });

    it.each(permissionDeniedCases)("$mutationName rejects a missing token with UNAUTHENTICATED, never executing the mutation", async ({ query, variables }) => {
      const response = await gql(query, variables).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.data).toBeNull();
      expect(body.errors?.[0].extensions?.code).toBe("UNAUTHENTICATED");
    });
  });

  describe(`mutations (${mediaSlug} — media field persistence)`, () => {
    it("createMediaSlug/updateMediaSlug persist a submitted media FK that reads back as a full MediaAsset", async () => {
      const uploadResponse = await request(app.getHttpServer())
        .post("/api/v1/media/upload")
        .set("Cookie", [superAdminCookie])
        .attach("file", buildPngBuffer(200, 150), "mutation-cover.png")
        .expect(201);
      const mutationMediaDocumentId = (uploadResponse.body as MediaUploadResponseBody).documentId;
      createdMediaIds.push(mutationMediaDocumentId);

      const createMutationField = createMutationName(mediaSlug);
      const createResult = await gql(
        `mutation($data: ${inputTypeName(mediaSlug)}!) {
          ${createMutationField}(data: $data) { documentId title cover { documentId fileName } }
        }`,
        { data: { title: `Mutation media ${runId}`, cover: mutationMediaDocumentId } },
        createOnlyApiToken,
      ).expect(200);
      const createBody = createResult.body as GraphQLResponseBody;
      expect(createBody.errors).toBeUndefined();
      const created = (createBody.data as Record<string, { documentId: string; title: string; cover: { documentId: string; fileName: string } }>)[createMutationField];
      const documentId = created.documentId;
      pendingCleanupMediaTypeIds.add(documentId);
      expect(created).toMatchObject({ title: `Mutation media ${runId}`, cover: { documentId: mutationMediaDocumentId, fileName: "mutation-cover.png" } });

      const updateMutationField = updateMutationName(mediaSlug);
      const updateResult = await gql(
        `mutation($Id: ID!, $data: ${inputTypeName(mediaSlug)}!) {
          ${updateMutationField}(Id: $Id, data: $data) { documentId title cover { documentId fileName } }
        }`,
        { Id: documentId, data: { title: `Mutation media updated ${runId}`, cover: mutationMediaDocumentId } },
        updateOnlyApiToken,
      ).expect(200);
      const updateBody = updateResult.body as GraphQLResponseBody;
      expect(updateBody.errors).toBeUndefined();
      const updated = (updateBody.data as Record<string, { documentId: string; title: string; cover: { documentId: string; fileName: string } }>)[updateMutationField];
      expect(updated).toMatchObject({ documentId, title: `Mutation media updated ${runId}`, cover: { documentId: mutationMediaDocumentId, fileName: "mutation-cover.png" } });
    });
  });

  describe(`single-type (${singleSlug})`, () => {
    it("round-trips a full lifecycle — save, publish, unpublish — via a token scoped with exactly its required permission, no Id anywhere", async () => {
      const saveField = saveMutationName(singleSlug);
      const publishField = publishMutationName(singleSlug);
      const unpublishField = unpublishMutationName(singleSlug);

      const saveResult = await gql(
        `mutation($data: ${inputTypeName(singleSlug)}!) { ${saveField}(data: $data) { documentId heroTitle } }`,
        { data: { heroTitle: `Single Type ${runId}` } },
        updateOnlyApiToken,
      ).expect(200);
      const saveBody = saveResult.body as GraphQLResponseBody;
      expect(saveBody.errors).toBeUndefined();
      const saved = (saveBody.data as Record<string, { documentId: string; heroTitle: string }>)[saveField];
      expect(saved).toMatchObject({ heroTitle: `Single Type ${runId}` });

      const publicReadBeforePublish = await gql(`{ ${singleQueryName} { heroTitle } }`, undefined, readScopedApiToken).expect(200);
      expect((publicReadBeforePublish.body as GraphQLResponseBody).data).toEqual({ [singleQueryName]: null });

      const draftReadBeforePublish = await gql(`{ ${singleQueryName}(status: "draft") { heroTitle } }`, undefined, readScopedApiToken).expect(200);
      expect((draftReadBeforePublish.body as GraphQLResponseBody).data).toEqual({ [singleQueryName]: { heroTitle: `Single Type ${runId}` } });

      const publishResult = await gql(`mutation { ${publishField} { heroTitle } }`, undefined, publishOnlyApiToken).expect(200);
      const publishBody = publishResult.body as GraphQLResponseBody;
      expect(publishBody.errors).toBeUndefined();
      expect(publishBody.data).toEqual({ [publishField]: { heroTitle: `Single Type ${runId}` } });

      const publicReadAfterPublish = await gql(`{ ${singleQueryName} { heroTitle } }`, undefined, readScopedApiToken).expect(200);
      expect((publicReadAfterPublish.body as GraphQLResponseBody).data).toEqual({ [singleQueryName]: { heroTitle: `Single Type ${runId}` } });

      const unpublishResult = await gql(`mutation { ${unpublishField} { heroTitle } }`, undefined, unpublishOnlyApiToken).expect(200);
      const unpublishBody = unpublishResult.body as GraphQLResponseBody;
      expect(unpublishBody.errors).toBeUndefined();
      expect(unpublishBody.data).toEqual({ [unpublishField]: { heroTitle: `Single Type ${runId}` } });

      const publicReadAfterUnpublish = await gql(`{ ${singleQueryName} { heroTitle } }`, undefined, readScopedApiToken).expect(200);
      expect((publicReadAfterUnpublish.body as GraphQLResponseBody).data).toEqual({ [singleQueryName]: null });
    });

    it(`rejects a ${singleQueryName} published-data query with no token, UNAUTHENTICATED`, async () => {
      const response = await gql(`{ ${singleQueryName} { heroTitle } }`).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.data).toEqual({ [singleQueryName]: null });
      expect(body.errors?.[0].extensions?.code).toBe("UNAUTHENTICATED");
    });

    it(`${saveMutationName(singleSlug)} rejects a wrongly-scoped token with FORBIDDEN, never executing the mutation`, async () => {
      const saveField = saveMutationName(singleSlug);
      const response = await gql(
        `mutation($data: ${inputTypeName(singleSlug)}!) { ${saveField}(data: $data) { documentId } }`,
        { data: { heroTitle: "X" } },
        readScopedApiToken,
      ).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.data).toBeNull();
      expect(body.errors?.[0].extensions?.code).toBe("FORBIDDEN");
    });

    it(`${saveMutationName(singleSlug)} rejects a missing token with UNAUTHENTICATED, never executing the mutation`, async () => {
      const saveField = saveMutationName(singleSlug);
      const response = await gql(`mutation($data: ${inputTypeName(singleSlug)}!) { ${saveField}(data: $data) { documentId } }`, { data: { heroTitle: "X" } }).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.data).toBeNull();
      expect(body.errors?.[0].extensions?.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("introspection gating", () => {
    it("allows a normal query to execute regardless of introspection gating", async () => {
      const response = await gql(`{ cvPageList(size: 1) { position } }`, undefined, readScopedApiToken).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.errors).toBeUndefined();
    });

    // NODE_ENV isn't "production" while running the test suite, so introspection is enabled here
    // (Task 1.1's dev-only gate) — this proves the wiring actually reaches Apollo Server and
    // reflects the full generated schema (every real + throwaway content type registered above),
    // not just Task 1.1's original placeholder `_empty` schema. The gate itself (disabled when
    // NODE_ENV=production) is unit-tested behaviorally in graphql.module.spec.ts, since flipping
    // NODE_ENV inside a live e2e app would require a second full app boot.
    it("serves a real introspection query reflecting the full generated schema, proving the dev-only gate is wired end-to-end", async () => {
      const response = await gql(`{ __schema { queryType { name } types { name } } }`).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.errors).toBeUndefined();
      const schema = (body.data as { __schema: { queryType: { name: string }; types: { name: string }[] } }).__schema;
      expect(schema.queryType.name).toBe("Query");
      const typeNames = schema.types.map((type) => type.name);
      expect(typeNames).toEqual(expect.arrayContaining(["CvPage", "EnItVocab", typeName(singleSlug), "MediaAsset"]));
    });
  });
});

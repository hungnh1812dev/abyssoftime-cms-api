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
import { queryName } from "@/modules/graphql/domain/naming";
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
  const storage = new NoopStorageAdapter();

  let app: INestApplication<App>;
  let prisma: PrismaService;
  let schemaLoader: SchemaLoaderService;
  let syncService: ContentTypeSyncService;
  let accessTokens: IAccessTokenRepository;
  let realDefs: ContentTypeDefinition[];

  let superAdminCookie: string;
  let readScopedApiToken: string;
  let readScopedTokenId: string;
  let noScopeTokenId: string;

  const createdUserIds: string[] = [];
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

  function gql(query: string, variables?: Record<string, unknown>, token?: string) {
    const req = request(app.getHttpServer()).post("/graphql").send({ query, variables });
    if (token) {
      req.set("Authorization", `Bearer ${token}`);
    }
    return req;
  }

  beforeAll(async () => {
    await writeFile(mediaDefPath, JSON.stringify(mediaDefContents, null, 2));

    app = await bootTestApp((builder) => builder.overrideProvider(STORAGE_ADAPTER).useValue(storage));

    prisma = app.get(PrismaService);
    schemaLoader = app.get(SchemaLoaderService);
    syncService = app.get(ContentTypeSyncService);
    const jwtTokenService = app.get(JwtTokenService);
    const createAccessToken = app.get(CreateAccessTokenService);
    accessTokens = app.get(ACCESS_TOKEN_REPOSITORY);

    const allDefsOnDisk = await schemaLoader.load();
    realDefs = allDefsOnDisk.filter((definition) => definition.slug !== mediaSlug);

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
    readScopedTokenId = readScoped.entity.documentId;

    const noScope = await createAccessToken.execute({ name: `e2e-graphql-noscope-${runId}`, permissions: [], expiresIn: "1h" }, null);
    noScopeTokenId = noScope.entity.documentId;
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

    // Remove the throwaway content type's file, then re-sync to only the real seeds — drops its
    // table via the same sync() the boot process uses, keeping the two real seeds untouched.
    await unlink(mediaDefPath).catch(() => undefined);
    await syncService.sync(realDefs);

    await accessTokens.delete(readScopedTokenId);
    await accessTokens.delete(noScopeTokenId);

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

    it("returns the published document with no token required", async () => {
      const response = await gql(`{ cvPage(Id: "${documentId}") { position company } }`).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.errors).toBeUndefined();
      expect(body.data).toEqual({ cvPage: { position: `GraphQL Engineer ${runId}`, company: `Acme-${runId}` } });
    });

    it("returns null (not a GraphQL error) for a nonexistent Id", async () => {
      const response = await gql(`{ cvPage(Id: "${randomUUID()}") { position } }`).expect(200);

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

    it("filters, orders, and paginates published rows, no token required", async () => {
      const query = `
        query($where: CvPageFilter, $orderBy: CvPageOrderBy) {
          cvPageList(where: $where, orderBy: $orderBy, start: 0, size: 10) { position isMain }
        }
      `;
      const response = await gql(query, { where: { company: { eq: `${filterTag}-Co` } }, orderBy: { position: "ASC" } }).expect(200);

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
      const response = await gql(query).expect(200);

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
      const response = await gql(query).expect(200);

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

      const response = await gql(`{ ${mediaQueryName}(Id: "${noCoverDocumentId}") { title cover { documentId } } }`).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.errors).toBeUndefined();
      expect(body.data).toEqual({ [mediaQueryName]: { title: `No cover ${runId}`, cover: null } });
    });
  });

  describe("introspection gating", () => {
    it("allows a normal query to execute regardless of introspection gating", async () => {
      const response = await gql(`{ cvPageList(size: 1) { position } }`).expect(200);

      const body = response.body as GraphQLResponseBody;
      expect(body.errors).toBeUndefined();
    });
  });
});

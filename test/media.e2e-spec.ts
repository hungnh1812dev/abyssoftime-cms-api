import { randomUUID } from "node:crypto";
import request from "supertest";
import { type App } from "supertest/types";

import { type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { type EnvironmentVariables } from "@/config/env.validation";
import { STORAGE_ADAPTER } from "@/modules/storage/domain/repositories/storage-adapter.repository";
import { PrismaService } from "@/prisma/application/prisma.service";

import { bootTestApp } from "./utils/app-test.util";
import { NoopStorageAdapter } from "./utils/noop-storage.adapter";

interface MediaUploadResponseBody {
  documentId: string;
  publicId: string;
}

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

describe("Media (e2e)", () => {
  const runId = randomUUID().slice(0, 8);
  const storage = new NoopStorageAdapter();

  let app: INestApplication<App>;
  let prisma: PrismaService;
  let managerToken: string;
  let readOnlyToken: string;
  let managerUserId: string;

  const createdMediaIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await bootTestApp((builder) => builder.overrideProvider(STORAGE_ADAPTER).useValue(storage));

    prisma = app.get(PrismaService);
    const jwtTokenService = app.get(JwtTokenService);

    const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { slug: "super_admin" } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { slug: "admin" } });

    const manager = await prisma.user.create({
      data: {
        email: `media-e2e-manager-${runId}@example.com`,
        name: "Media E2E Manager",
        username: `media_e2e_mgr_${runId}`,
        password: "not-used",
        accountType: true,
        verified: true,
        roleId: superAdminRole.documentId,
      },
    });
    createdUserIds.push(manager.documentId);
    managerUserId = manager.documentId;

    const reader = await prisma.user.create({
      data: {
        email: `media-e2e-reader-${runId}@example.com`,
        name: "Media E2E Reader",
        username: `media_e2e_rdr_${runId}`,
        password: "not-used",
        accountType: true,
        verified: true,
        roleId: adminRole.documentId,
      },
    });
    createdUserIds.push(reader.documentId);

    managerToken = jwtTokenService.signAccessToken({
      sub: manager.documentId,
      roleSlug: superAdminRole.slug,
      level: superAdminRole.level,
      permissions: superAdminRole.permissions as string[],
    });
    readOnlyToken = jwtTokenService.signAccessToken({
      sub: reader.documentId,
      roleSlug: adminRole.slug,
      level: adminRole.level,
      permissions: adminRole.permissions as string[],
    });
  });

  afterAll(async () => {
    if (!app) {
      return;
    }
    if (createdMediaIds.length > 0) {
      await prisma.mediaAsset.deleteMany({ where: { documentId: { in: createdMediaIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { documentId: { in: createdUserIds } } });
    }
    await app.close();
  });

  it("rejects an unauthenticated request with 401", async () => {
    await request(app.getHttpServer()).get("/api/media").expect(401);
  });

  it("uploads an image successfully with a media:manager token", async () => {
    const buffer = buildPngBuffer(800, 600);

    const response = await request(app.getHttpServer())
      .post("/api/media/upload")
      .set("Cookie", [`access_token=${managerToken}`])
      .attach("file", buffer, "photo.png")
      .expect(201);

    expect(response.body).toMatchObject({
      fileName: "photo.png",
      mimeType: "image/png",
      width: 800,
      height: 600,
      uploadedBy: managerUserId,
    });
    expect(storage.uploads).toHaveLength(1);
    createdMediaIds.push((response.body as MediaUploadResponseBody).documentId);
  });

  it("rejects an upload over MEDIA_MAX_UPLOAD_BYTES with 413 and never touches storage", async () => {
    const uploadsBefore = storage.uploads.length;
    const maxUploadBytes = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService).get("MEDIA_MAX_UPLOAD_BYTES", { infer: true });
    const buffer = buildPngBuffer(1, 1);
    const oversized = Buffer.concat([buffer, Buffer.alloc(maxUploadBytes - buffer.length + 1)]);

    await request(app.getHttpServer())
      .post("/api/media/upload")
      .set("Cookie", [`access_token=${managerToken}`])
      .attach("file", oversized, "too-big.png")
      .expect(413);

    expect(storage.uploads).toHaveLength(uploadsBefore);
  });

  it("rejects a non-image upload with 422 and never touches storage", async () => {
    const uploadsBefore = storage.uploads.length;
    const buffer = Buffer.from("just some plain text, not an image");

    await request(app.getHttpServer())
      .post("/api/media/upload")
      .set("Cookie", [`access_token=${managerToken}`])
      .attach("file", buffer, "note.txt")
      .expect(422);

    expect(storage.uploads).toHaveLength(uploadsBefore);
  });

  it("rejects upload from a media:read-only token with 403", async () => {
    const buffer = buildPngBuffer(400, 300);

    await request(app.getHttpServer())
      .post("/api/media/upload")
      .set("Cookie", [`access_token=${readOnlyToken}`])
      .attach("file", buffer, "photo.png")
      .expect(403);
  });

  it("lists media reachable by a media:read-only token", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/media")
      .set("Cookie", [`access_token=${readOnlyToken}`])
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it("deletes a media asset, removing both the storage object and the DB row", async () => {
    const buffer = buildPngBuffer(200, 200);
    const uploadResponse = await request(app.getHttpServer())
      .post("/api/media/upload")
      .set("Cookie", [`access_token=${managerToken}`])
      .attach("file", buffer, "to-delete.png")
      .expect(201);
    const { documentId, publicId } = uploadResponse.body as MediaUploadResponseBody;

    await request(app.getHttpServer())
      .delete(`/api/media/${documentId}`)
      .set("Cookie", [`access_token=${managerToken}`])
      .expect(204);

    expect(storage.deletes).toContain(publicId);
    const row = await prisma.mediaAsset.findUnique({ where: { documentId } });
    expect(row).toBeNull();
  });

  it("returns 403 when deleting without a media:manager token", async () => {
    const buffer = buildPngBuffer(150, 150);
    const uploadResponse = await request(app.getHttpServer())
      .post("/api/media/upload")
      .set("Cookie", [`access_token=${managerToken}`])
      .attach("file", buffer, "protected.png")
      .expect(201);
    const documentId = (uploadResponse.body as MediaUploadResponseBody).documentId;
    createdMediaIds.push(documentId);

    await request(app.getHttpServer())
      .delete(`/api/media/${documentId}`)
      .set("Cookie", [`access_token=${readOnlyToken}`])
      .expect(403);
  });

  it("returns 404 when deleting an unknown media asset", async () => {
    await request(app.getHttpServer())
      .delete("/api/media/00000000-0000-0000-0000-000000000000")
      .set("Cookie", [`access_token=${managerToken}`])
      .expect(404);
  });

  it("leaves the DB row intact when the storage delete fails", async () => {
    const buffer = buildPngBuffer(100, 100);
    const uploadResponse = await request(app.getHttpServer())
      .post("/api/media/upload")
      .set("Cookie", [`access_token=${managerToken}`])
      .attach("file", buffer, "keep.png")
      .expect(201);
    const documentId = (uploadResponse.body as MediaUploadResponseBody).documentId;
    createdMediaIds.push(documentId);

    storage.failNextDelete();

    await request(app.getHttpServer())
      .delete(`/api/media/${documentId}`)
      .set("Cookie", [`access_token=${managerToken}`])
      .expect(500);

    const row = await prisma.mediaAsset.findUnique({ where: { documentId } });
    expect(row).not.toBeNull();
  });
});

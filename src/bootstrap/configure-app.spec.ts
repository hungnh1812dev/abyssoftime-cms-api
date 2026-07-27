import { CreatePermissionDto } from "../modules/permissions/application/dto/create-permission.dto";
import { CreatePermissionService } from "../modules/permissions/application/services/create-permission.service";
import { DeletePermissionService } from "../modules/permissions/application/services/delete-permission.service";
import { ListPermissionService } from "../modules/permissions/application/services/list-permission.service";
import { UpdatePermissionService } from "../modules/permissions/application/services/update-permission.service";
import { PermissionEntity } from "../modules/permissions/domain/entities/permission.entity";
import { PermissionController } from "../modules/permissions/presentation/permission.controller";
import request from "supertest";

import { ConfigService } from "@nestjs/config";
import { type NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";

import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";

import { configureApp, parseTrustProxy } from "./configure-app";

describe("parseTrustProxy", () => {
  it("parses boolean-looking strings as booleans", () => {
    expect(parseTrustProxy("true")).toBe(true);
    expect(parseTrustProxy("false")).toBe(false);
  });

  it("parses numeric strings as numbers (hop count)", () => {
    expect(parseTrustProxy("1")).toBe(1);
    expect(parseTrustProxy("2")).toBe(2);
  });

  it("passes through named presets/CIDR lists as-is", () => {
    expect(parseTrustProxy("loopback")).toBe("loopback");
    expect(parseTrustProxy("10.0.0.0/8,172.16.0.0/12")).toBe("10.0.0.0/8,172.16.0.0/12");
  });
});

describe("configureApp", () => {
  let app: NestExpressApplication;
  let createPermission: jest.Mocked<CreatePermissionService>;

  const permission = new PermissionEntity("permission-1", "document:read", "Read document", "Allows reading a document", new Date(), new Date(), "");

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PermissionController],
      providers: [
        { provide: ListPermissionService, useValue: { execute: jest.fn() } },
        { provide: CreatePermissionService, useValue: { execute: jest.fn().mockResolvedValue(permission) } },
        { provide: UpdatePermissionService, useValue: { execute: jest.fn() } },
        { provide: DeletePermissionService, useValue: { execute: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => (key === "TRUST_PROXY" ? "1" : undefined)) } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication<NestExpressApplication>();
    configureApp(app);
    createPermission = module.get(CreatePermissionService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("rejects a malformed body with 400 before it reaches the controller", async () => {
    await request(app.getHttpServer()).post("/api/permissions").send({ name: "" }).expect(400);

    expect(createPermission.execute).not.toHaveBeenCalled();
  });

  it("still accepts a valid body", async () => {
    const dto: CreatePermissionDto = { slug: "document:read", name: "Read document", description: "Allows reading a document" };

    await request(app.getHttpServer()).post("/api/permissions").send(dto).expect(201);

    expect(createPermission.execute).toHaveBeenCalledWith(dto);
  });

  it("rejects unknown properties in the body with 400 before it reaches the controller", async () => {
    const dto: CreatePermissionDto = { slug: "document:read", name: "Read document", description: "Allows reading a document" };

    await request(app.getHttpServer())
      .post("/api/permissions")
      .send({ ...dto, notAllowed: "value" })
      .expect(400);

    expect(createPermission.execute).not.toHaveBeenCalled();
  });
});

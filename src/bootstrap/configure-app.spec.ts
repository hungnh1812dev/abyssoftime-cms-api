import { CreatePermissionDto } from "../modules/permissions/application/dto/create-permission.dto";
import { CreatePermissionService } from "../modules/permissions/application/services/create-permission.service";
import { DeletePermissionService } from "../modules/permissions/application/services/delete-permission.service";
import { ListPermissionService } from "../modules/permissions/application/services/list-permission.service";
import { UpdatePermissionService } from "../modules/permissions/application/services/update-permission.service";
import { PermissionEntity } from "../modules/permissions/domain/entities/permission.entity";
import { PermissionController } from "../modules/permissions/presentation/permission.controller";
import request from "supertest";
import { App } from "supertest/types";

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { configureApp } from "./configure-app";

describe("configureApp", () => {
  let app: INestApplication<App>;
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
      ],
    }).compile();

    app = module.createNestApplication();
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

  it("strips unknown properties from the body before it reaches the controller", async () => {
    const dto: CreatePermissionDto = { slug: "document:read", name: "Read document", description: "Allows reading a document" };

    await request(app.getHttpServer())
      .post("/api/permissions")
      .send({ ...dto, notAllowed: "value" })
      .expect(201);

    expect(createPermission.execute).toHaveBeenCalledWith(dto);
  });
});

import { CreatePermissionDto } from "../modules/permissions/application/dto/create-permission.dto";
import { CreatePermissionService } from "../modules/permissions/application/services/create-permission.service";
import { DeletePermissionService } from "../modules/permissions/application/services/delete-permission.service";
import { ListPermissionService } from "../modules/permissions/application/services/list-permission.service";
import { UpdatePermissionService } from "../modules/permissions/application/services/update-permission.service";
import { PermissionEntity } from "../modules/permissions/domain/entities/permission.entity";
import { PermissionController } from "../modules/permissions/presentation/permission.controller";
import request from "supertest";

import { Controller, Get, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";

import { AppController } from "@/app.controller";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";

import { configureApp, parseCorsOrigins, parseTrustProxy } from "./configure-app";

describe("parseCorsOrigins", () => {
  it("parses a single origin", () => {
    expect(parseCorsOrigins("http://localhost:3000")).toEqual(["http://localhost:3000"]);
  });

  it("parses multiple origins separated by commas, trimming whitespace", () => {
    expect(parseCorsOrigins("http://localhost:3000, https://admin.example.com ,https://foo.example.com")).toEqual([
      "http://localhost:3000",
      "https://admin.example.com",
      "https://foo.example.com",
    ]);
  });

  it("drops empty segments from a trailing comma", () => {
    expect(parseCorsOrigins("http://localhost:3000,")).toEqual(["http://localhost:3000"]);
  });
});

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
      controllers: [PermissionController, AppController],
      providers: [
        { provide: ListPermissionService, useValue: { execute: jest.fn() } },
        { provide: CreatePermissionService, useValue: { execute: jest.fn().mockResolvedValue(permission) } },
        { provide: UpdatePermissionService, useValue: { execute: jest.fn() } },
        { provide: DeletePermissionService, useValue: { execute: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "TRUST_PROXY") return "1";
              if (key === "CORS_ORIGINS") return "http://localhost:3000";
              return undefined;
            }),
          },
        },
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
    await request(app.getHttpServer()).post("/api/v1/permissions").send({ name: "" }).expect(400);

    expect(createPermission.execute).not.toHaveBeenCalled();
  });

  it("still accepts a valid body", async () => {
    const dto: CreatePermissionDto = { slug: "document:read", name: "Read document", description: "Allows reading a document" };

    await request(app.getHttpServer()).post("/api/v1/permissions").send(dto).expect(201);

    expect(createPermission.execute).toHaveBeenCalledWith(dto);
  });

  it("rejects unknown properties in the body with 400 before it reaches the controller", async () => {
    const dto: CreatePermissionDto = { slug: "document:read", name: "Read document", description: "Allows reading a document" };

    await request(app.getHttpServer())
      .post("/api/v1/permissions")
      .send({ ...dto, notAllowed: "value" })
      .expect(400);

    expect(createPermission.execute).not.toHaveBeenCalled();
  });

  it("404s on the unversioned path — the global prefix is enforced", async () => {
    await request(app.getHttpServer()).get("/permissions").expect(404);
  });

  it("serves /health outside the /api/v1 prefix", async () => {
    await request(app.getHttpServer()).get("/health").expect(200, { status: "ok" });
  });

  it("404s on /api/v1/health — the exclude only applies to the unprefixed path", async () => {
    await request(app.getHttpServer()).get("/api/v1/health").expect(404);
  });
});

@Controller("query-echo")
class QueryEchoController {
  @Get()
  echo(@Query() query: unknown): unknown {
    return query;
  }
}

describe("configureApp query parser", () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [QueryEchoController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "TRUST_PROXY") return "1";
              if (key === "CORS_ORIGINS") return "http://localhost:3000";
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("parses bracket-notation query params into nested objects (Express 5 defaults to 'simple', which would keep them as flat string keys)", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/query-echo")
      .query({ filters: { position: { $contains: "hello" } } })
      .expect(200);

    expect(response.body).toEqual({ filters: { position: { $contains: "hello" } } });
  });
});

@Controller("public/documents")
class PublicDocumentsEchoController {
  @Get("single-type/:id")
  echo(): unknown {
    return { ok: true };
  }
}

describe("configureApp CORS", () => {
  const ALLOWED_ORIGIN = "http://localhost:3000";
  let app: NestExpressApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [QueryEchoController, PublicDocumentsEchoController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "TRUST_PROXY") return "1";
              if (key === "CORS_ORIGINS") return ALLOWED_ORIGIN;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns credentialed CORS headers for an allowed origin on /api/v1/*", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/query-echo").set("Origin", ALLOWED_ORIGIN).expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not return a matching Access-Control-Allow-Origin for a disallowed origin on /api/v1/*", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/query-echo").set("Origin", "http://evil.example.com").expect(200);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("reflects any origin with no credentials header on /api/v1/public/documents/*", async () => {
    const arbitraryOrigin = "http://anything.example.com";
    const response = await request(app.getHttpServer()).get("/api/v1/public/documents/single-type/x").set("Origin", arbitraryOrigin).expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe(arbitraryOrigin);
    expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("responds 2xx to an OPTIONS preflight from an allowed origin with the right headers", async () => {
    const response = await request(app.getHttpServer()).options("/api/v1/query-echo").set("Origin", ALLOWED_ORIGIN).set("Access-Control-Request-Method", "GET").expect(204);

    expect(response.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("never sets Access-Control-Allow-Credentials on /api/v1/public/documents/* even for an allowlisted origin", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/public/documents/single-type/x").set("Origin", ALLOWED_ORIGIN).expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("responds 2xx to an OPTIONS preflight on /api/v1/public/documents/* from an arbitrary origin, with no credentials header", async () => {
    const arbitraryOrigin = "http://anything.example.com";
    const response = await request(app.getHttpServer())
      .options("/api/v1/public/documents/single-type/x")
      .set("Origin", arbitraryOrigin)
      .set("Access-Control-Request-Method", "GET")
      .expect(204);

    expect(response.headers["access-control-allow-origin"]).toBe(arbitraryOrigin);
    expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
  });
});

describe("configureApp CORS_ORIGINS validation", () => {
  it("throws at boot if CORS_ORIGINS parses to an empty origin list", async () => {
    const module = await Test.createTestingModule({
      controllers: [QueryEchoController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "TRUST_PROXY") return "1";
              if (key === "CORS_ORIGINS") return ",";
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const app = module.createNestApplication<NestExpressApplication>();

    expect(() => configureApp(app)).toThrow(/CORS_ORIGINS/);

    await app.close();
  });
});

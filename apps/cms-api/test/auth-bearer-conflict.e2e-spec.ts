import { randomUUID } from "node:crypto";
import request from "supertest";
import { type App } from "supertest/types";

import { type INestApplication } from "@nestjs/common";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { CreateAccessTokenService } from "@/modules/access-tokens/application/services/create-access-token.service";
import { ACCESS_TOKEN_REPOSITORY, type IAccessTokenRepository } from "@/modules/access-tokens/domain/repositories/access-token.repository";

import { bootTestApp } from "./utils/app-test.util";

// JwtAuthGuard = AuthGuard(["jwt", "api-token"]) shares one route between two Passport
// strategies that, after the cookie->Bearer migration, both read the same Authorization header
// (see jwt-auth.guard.ts's load-bearing-order comment). This proves neither strategy broke the
// other's path through the shared header — not just that each works in isolation.
describe("Auth Bearer-header conflict (e2e)", () => {
  const runId = randomUUID().slice(0, 8);
  const PROTECTED_ROUTE = "/api/v1/content-types";

  let app: INestApplication<App>;
  let accessTokens: IAccessTokenRepository;
  const createdApiTokenIds: string[] = [];

  beforeAll(async () => {
    app = await bootTestApp();
    accessTokens = app.get(ACCESS_TOKEN_REPOSITORY);
  });

  afterAll(async () => {
    for (const tokenId of createdApiTokenIds) {
      await accessTokens.delete(tokenId);
    }
    await app.close();
  });

  it("succeeds for a JWT sent as Authorization: Bearer (proves the header path, not a stale cookie path)", async () => {
    const jwtTokenService = app.get(JwtTokenService);
    const token = jwtTokenService.signAccessToken({
      sub: `auth-bearer-conflict-jwt-${runId}`,
      roleSlug: "super_admin",
      level: 100,
      permissions: ["content_type:read"],
    });

    await request(app.getHttpServer()).get(PROTECTED_ROUTE).set("Authorization", `Bearer ${token}`).expect(200);
  });

  it("succeeds for an API token sent the same way, through the same guard", async () => {
    const createAccessToken = app.get(CreateAccessTokenService);
    const { plaintext, entity } = await createAccessToken.execute({ name: `auth-bearer-conflict-api-${runId}`, permissions: ["content_type:read"], expiresIn: "1h" }, null);
    createdApiTokenIds.push(entity.documentId);

    await request(app.getHttpServer()).get(PROTECTED_ROUTE).set("Authorization", `Bearer ${plaintext}`).expect(200);
  });

  it("401s a garbage Bearer value that is neither a valid JWT nor a known API token", async () => {
    await request(app.getHttpServer()).get(PROTECTED_ROUTE).set("Authorization", "Bearer not-a-real-token-at-all").expect(401);
  });
});

import { type App } from "supertest/types";

import { type INestApplication } from "@nestjs/common";
import { type NestExpressApplication } from "@nestjs/platform-express";
import { Test, type TestingModuleBuilder } from "@nestjs/testing";

import { AppModule } from "@/app.module";
import { configureApp } from "@/bootstrap/configure-app";

export async function bootTestApp(configureModule?: (builder: TestingModuleBuilder) => TestingModuleBuilder): Promise<INestApplication<App>> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (configureModule) {
    builder = configureModule(builder);
  }

  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  return app;
}

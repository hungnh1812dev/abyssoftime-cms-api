import cookieParser from "cookie-parser";

import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { type EnvironmentVariables } from "@/config/env.validation";

const API_VERSION = "0.0.1";

export function parseTrustProxy(raw: string): boolean | number | string {
  if (raw === "true") return true;
  if (raw === "false") return false;
  const asNumber = Number(raw);
  return Number.isFinite(asNumber) && raw.trim() !== "" ? asNumber : raw;
}

export function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function configureSwagger(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Abyssoftime CMS API")
    .setDescription("REST API for the Abyssoftime schema-as-code CMS: content types, documents, media, and the auth/roles/permissions/users admin surface.")
    .setVersion(API_VERSION)
    .addCookieAuth("access_token", { type: "apiKey", in: "cookie", name: "access_token" })
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);
}

export function configureApp(app: NestExpressApplication): void {
  // Express 5 defaults to the "simple" query parser (no bracket-notation nesting); the document
  // list route's filters[field][$op]=value params need "extended" (qs-based) parsing to arrive as
  // a real nested object instead of one flat "filters[field][$op]" string key.
  app.set("query parser", "extended");

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.use(cookieParser());

  const configService: ConfigService<EnvironmentVariables, true> = app.get(ConfigService);
  const trustProxy = configService.get("TRUST_PROXY", { infer: true });
  app.set("trust proxy", parseTrustProxy(trustProxy));

  app.setGlobalPrefix("api/v1", { exclude: ["health"] });

  configureSwagger(app);
}

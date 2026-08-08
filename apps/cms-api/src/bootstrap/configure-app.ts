import { type EnvironmentVariables } from "../config/env.validation";
import cookieParser from "cookie-parser";
import { type Request } from "express";

import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { forceIpv4Dns } from "./force-ipv4-dns";

const API_VERSION = "0.0.1";

// setGlobalPrefix only rewrites controller route strings — CORS middleware runs ahead of the Nest
// router and always sees the raw, prefixed path.
const PUBLIC_DOCUMENTS_PATH_PREFIX = "/api/v1/public/documents/";

// NestExpressApplication#enableCors is typed `options?: any`, so these mirror the `cors` package's
// delegate/options shape (Nest's own CorsOptionsDelegate/CorsOptionsCallback aren't exported from
// @nestjs/common's public API) purely for our own type safety.
interface CorsResponseOptions {
  origin: boolean | string[];
  credentials: boolean;
}

type CorsOptionsCallback = (error: Error | null, options: CorsResponseOptions) => void;

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

function configureCors(app: NestExpressApplication, configService: ConfigService<EnvironmentVariables, true>): void {
  const allowedOrigins = parseCorsOrigins(configService.get("CORS_ORIGINS", { infer: true }));

  // env.validation only checks the raw string is non-empty; a value like "," parses to an empty
  // array, which the `cors` package treats as deny-all rather than allow-all — safe, but silent.
  // Fail loudly at boot instead of leaving every /api/v1/* request unexplainedly CORS-blocked.
  if (allowedOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must contain at least one valid origin");
  }

  function delegate(req: Request, callback: CorsOptionsCallback): void {
    if (req.path.startsWith(PUBLIC_DOCUMENTS_PATH_PREFIX)) {
      callback(null, { origin: true, credentials: false });
      return;
    }
    callback(null, { origin: allowedOrigins, credentials: true });
  }

  app.enableCors(delegate);
}

function configureSwagger(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Abyssoftime CMS API")
    .setDescription("REST API for the Abyssoftime schema-as-code CMS: content types, documents, media, and the auth/roles/permissions/users admin surface.")
    .setVersion(API_VERSION)
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

  if (configService.get("SMTP_FORCE_IPV4_DNS", { infer: true })) {
    forceIpv4Dns();
  }

  const trustProxy = configService.get("TRUST_PROXY", { infer: true });
  app.set("trust proxy", parseTrustProxy(trustProxy));

  configureCors(app, configService);

  app.setGlobalPrefix("api/v1", { exclude: ["health"] });

  configureSwagger(app);
}

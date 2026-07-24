import cookieParser from "cookie-parser";

import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type NestExpressApplication } from "@nestjs/platform-express";

import { type EnvironmentVariables } from "@/config/env.validation";

export function parseTrustProxy(raw: string): boolean | number | string {
  if (raw === "true") return true;
  if (raw === "false") return false;
  const asNumber = Number(raw);
  return Number.isFinite(asNumber) && raw.trim() !== "" ? asNumber : raw;
}

export function configureApp(app: NestExpressApplication): void {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(cookieParser());

  const configService: ConfigService<EnvironmentVariables, true> = app.get(ConfigService);
  const trustProxy = configService.get("TRUST_PROXY", { infer: true });
  app.set("trust proxy", parseTrustProxy(trustProxy));
}

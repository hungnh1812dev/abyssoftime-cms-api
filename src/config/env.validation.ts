import { plainToInstance, Transform } from "class-transformer";
import { IsIn, IsInt, IsString, Min, MinLength, validateSync } from "class-validator";

export const SUPPORTED_DB_DRIVERS = ["postgresql", "mysql", "sqlite"] as const;
export type DbDriver = (typeof SUPPORTED_DB_DRIVERS)[number];

export const SUPPORTED_EMAIL_TEMPLATE_ENGINES = ["ts", "handlebars"] as const;
export type EmailTemplateEngine = (typeof SUPPORTED_EMAIL_TEMPLATE_ENGINES)[number];

export class EnvironmentVariables {
  // DB Connection
  @IsIn(SUPPORTED_DB_DRIVERS)
  DB_DRIVER: DbDriver = "postgresql";

  @IsString()
  @MinLength(1)
  DB_HOST: string = "localhost";

  @IsString()
  @MinLength(1)
  DB_NAME: string = "abyssoftime-cms";

  @IsString()
  DB_PASSWORD: string = "";

  @IsString()
  @MinLength(1)
  DB_PORT: string = "5432";

  @IsString()
  @MinLength(1)
  DB_USERNAME: string = "postgres";

  // JWT
  @IsString()
  @MinLength(1)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(1)
  JWT_REFRESH_SECRET!: string;

  // COOKIE
  @Transform(({ value }: { value: unknown }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsIn([true, false])
  COOKIE_SECURE!: boolean;

  @IsIn(["lax", "strict", "none"])
  COOKIE_SAMESITE!: "lax" | "strict" | "none";

  // RATE LIMIT
  @Transform(({ value }: { value: unknown }) => (value === undefined ? 5 : Number(value)))
  @IsInt()
  @Min(1)
  RATE_LIMIT_FPS: number = 5;

  @Transform(({ value }: { value: unknown }) => (value === undefined ? 10 : Number(value)))
  @IsInt()
  @Min(1)
  RATE_LIMIT_BURST: number = 10;

  @IsString()
  @MinLength(1)
  CONTENT_TYPES_DIR: string = "content-types";

  @Transform(({ value }: { value: unknown }) => (value === undefined ? 10 * 1024 * 1024 : Number(value)))
  @IsInt()
  @Min(1)
  MEDIA_MAX_UPLOAD_BYTES: number = 10 * 1024 * 1024;

  @Transform(({ value }: { value: unknown }) => (value === undefined ? 8080 : Number(value)))
  @IsInt()
  @Min(1)
  SERVER_PORT: number = 8080;

  // Express "trust proxy" setting — how many hops of X-Forwarded-For to trust in front of this app.
  // Default "1" assumes a single reverse-proxy hop (e.g. Render's edge). See docs/documents/auth.md.
  @IsString()
  @MinLength(1)
  TRUST_PROXY: string = "1";

  // SMTP — SMTP_HOST unset means "use ConsoleEmailSender" (dev/test fallback), see resolve-email-sender.ts
  @IsString()
  SMTP_HOST: string = "";

  @Transform(({ value }: { value: unknown }) => (value === undefined ? 587 : Number(value)))
  @IsInt()
  @Min(1)
  SMTP_PORT: number = 587;

  @IsString()
  SMTP_USER: string = "";

  @IsString()
  SMTP_PASSWORD: string = "";

  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return false;
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsIn([true, false])
  SMTP_SECURE: boolean = false;

  @IsString()
  @MinLength(1)
  EMAIL_FROM: string = "no-reply@example.com";

  @IsString()
  @MinLength(1)
  FRONTEND_URL: string = "http://localhost:3000";

  // Email template rendering — "ts" (default, TypeScript template functions) or "handlebars" (.hbs files),
  // see resolve-email-template-renderer.ts
  @IsIn(SUPPORTED_EMAIL_TEMPLATE_ENGINES)
  EMAIL_TEMPLATE_ENGINE: EmailTemplateEngine = "ts";
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Environment variable validation failed: ${errors.toString()}`);
  }

  return validatedConfig;
}

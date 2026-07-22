import { plainToInstance, Transform } from "class-transformer";
import { IsIn, IsInt, IsString, Min, MinLength, validateSync } from "class-validator";

export class EnvironmentVariables {
  // DB Connection
  @IsString()
  @MinLength(1)
  DB_DRIVER: string = "postgresql";

  @IsString()
  @MinLength(1)
  DB_HOST: string = "localhost";

  @IsString()
  @MinLength(1)
  DB_NAME: string = "abyssoftime-cms";

  @IsString()
  @MinLength(1)
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

import { join } from "path";

import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";

import { validate } from "./env.validation";

// process.cwd() (not __dirname): both `bun run start`/`start:prod` (dist) and `bun run
// test:e2e` (ts-jest against src) are always invoked from the repo root, whereas __dirname's
// depth relative to the root differs between those two layouts.
const appRoot = process.cwd();

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(appRoot, ".env.test.local"), join(appRoot, ".env.local")],
      validate,
    }),
  ],
})
export class ConfigModule {}

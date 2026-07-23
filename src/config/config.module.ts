import { join } from "path";

import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";

import { validate } from "./env.validation";

const appRoot = join(__dirname, "./../..", "..");

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

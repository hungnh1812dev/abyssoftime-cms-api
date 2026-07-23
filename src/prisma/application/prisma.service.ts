import { EnvironmentVariables } from "../../config/env.validation";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaPg } from "@prisma/adapter-pg";

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaClient } from "./client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    const driver = configService.get("DB_DRIVER", { infer: true });
    const host = configService.get("DB_HOST", { infer: true });
    const port = Number(configService.get("DB_PORT", { infer: true }));
    const database = configService.get("DB_NAME", { infer: true });
    const user = configService.get("DB_USERNAME", { infer: true });
    const password = configService.get("DB_PASSWORD", { infer: true });

    switch (driver) {
      case "postgresql":
        super({ adapter: new PrismaPg({ host, port, database, user, password }) });
        break;
      case "mysql":
        super({ adapter: new PrismaMariaDb({ host, port, database, user, password }) });
        break;
      case "sqlite":
        super({ adapter: new PrismaBetterSqlite3({ url: database }) });
        break;
      default:
        throw new Error(`Unsupported DB_DRIVER: "${String(driver)}"`);
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

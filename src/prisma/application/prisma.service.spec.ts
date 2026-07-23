import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaPg } from "@prisma/adapter-pg";

import { type ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { PrismaService } from "./prisma.service";

jest.mock("@prisma/adapter-pg", () => ({ PrismaPg: jest.fn().mockImplementation((options: unknown) => ({ kind: "pg", options })) }));
jest.mock("@prisma/adapter-mariadb", () => ({ PrismaMariaDb: jest.fn().mockImplementation((options: unknown) => ({ kind: "mariadb", options })) }));
jest.mock("@prisma/adapter-better-sqlite3", () => ({ PrismaBetterSqlite3: jest.fn().mockImplementation((options: unknown) => ({ kind: "sqlite", options })) }));

jest.mock("./client", () => {
  class MockPrismaClient {
    public readonly options: unknown;
    public $connect = jest.fn().mockResolvedValue(undefined);
    public $disconnect = jest.fn().mockResolvedValue(undefined);

    constructor(options: unknown) {
      this.options = options;
    }
  }

  return { PrismaClient: MockPrismaClient };
});

type MockPrismaClient = { options: unknown; $connect: jest.Mock; $disconnect: jest.Mock };

describe("PrismaService", () => {
  const dbConfig = { DB_HOST: "db-host", DB_PORT: "6543", DB_NAME: "my-db", DB_USERNAME: "my-user", DB_PASSWORD: "my-password" };

  const makeConfigService = (driver: string): ConfigService<EnvironmentVariables, true> => {
    const values: Record<string, unknown> = { DB_DRIVER: driver, ...dbConfig };

    return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService<EnvironmentVariables, true>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds a PrismaPg adapter for the postgresql driver", () => {
    new PrismaService(makeConfigService("postgresql"));

    expect(PrismaPg).toHaveBeenCalledWith({ host: "db-host", port: 6543, database: "my-db", user: "my-user", password: "my-password" });
  });

  it("builds a PrismaMariaDb adapter for the mysql driver", () => {
    new PrismaService(makeConfigService("mysql"));

    expect(PrismaMariaDb).toHaveBeenCalledWith({ host: "db-host", port: 6543, database: "my-db", user: "my-user", password: "my-password" });
  });

  it("builds a PrismaBetterSqlite3 adapter for the sqlite driver, using DB_NAME as the file url", () => {
    new PrismaService(makeConfigService("sqlite"));

    expect(PrismaBetterSqlite3).toHaveBeenCalledWith({ url: "my-db" });
  });

  it("throws for an unsupported DB_DRIVER", () => {
    expect(() => new PrismaService(makeConfigService("mongodb"))).toThrow('Unsupported DB_DRIVER: "mongodb"');
  });

  it("onModuleInit() connects to the database", async () => {
    const service = new PrismaService(makeConfigService("postgresql"));

    await service.onModuleInit();

    expect((service as unknown as MockPrismaClient).$connect).toHaveBeenCalledTimes(1);
  });

  it("onModuleDestroy() disconnects from the database", async () => {
    const service = new PrismaService(makeConfigService("postgresql"));

    await service.onModuleDestroy();

    expect((service as unknown as MockPrismaClient).$disconnect).toHaveBeenCalledTimes(1);
  });
});

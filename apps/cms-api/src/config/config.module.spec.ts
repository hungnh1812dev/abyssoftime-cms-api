import { join } from "path";

import { MODULE_METADATA } from "@nestjs/common/constants";
import { ConfigModule as NestConfigModule } from "@nestjs/config";

import { ConfigModule } from "./config.module";
import { validate } from "./env.validation";

jest.mock("@nestjs/config", () => ({
  ConfigModule: { forRoot: jest.fn().mockReturnValue({ module: "MockedNestConfigModule" }) },
}));

describe("ConfigModule", () => {
  const options = jest.mocked(NestConfigModule.forRoot).mock.calls[0][0] as { isGlobal: boolean; validate: typeof validate; envFilePath: string[] };

  it("registers NestConfigModule as global with the env validator", () => {
    expect(options).toEqual(expect.objectContaining({ isGlobal: true, validate }));
  });

  it("loads .env.test.local before falling back to .env.local, relative to the app root", () => {
    const appRoot = process.cwd();

    expect(options.envFilePath).toEqual([join(appRoot, ".env.test.local"), join(appRoot, ".env.local")]);
  });

  it("declares imports as NestConfigModule.forRoot's return value", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, ConfigModule)).toEqual([{ module: "MockedNestConfigModule" }]);
  });
});

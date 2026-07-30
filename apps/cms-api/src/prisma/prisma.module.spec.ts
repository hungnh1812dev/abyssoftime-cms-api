import { GLOBAL_MODULE_METADATA, MODULE_METADATA } from "@nestjs/common/constants";

import { PrismaService } from "./application/prisma.service";
import { PrismaModule } from "./prisma.module";

describe("PrismaModule", () => {
  it("is a global module", () => {
    expect(Reflect.getMetadata(GLOBAL_MODULE_METADATA, PrismaModule)).toBe(true);
  });

  it("provides and exports PrismaService", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, PrismaModule)).toEqual([PrismaService]);
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, PrismaModule)).toEqual([PrismaService]);
  });
});

import { GLOBAL_MODULE_METADATA, MODULE_METADATA } from "@nestjs/common/constants";
import { JwtModule } from "@nestjs/jwt";

import { JwtTokenService } from "./jwt-token.service";
import { TokenModule } from "./token.module";

describe("TokenModule", () => {
  it("is a global module", () => {
    expect(Reflect.getMetadata(GLOBAL_MODULE_METADATA, TokenModule)).toBe(true);
  });

  it("imports JwtModule registered with no options", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, TokenModule)).toEqual([JwtModule.register({})]);
  });

  it("provides and exports JwtTokenService", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, TokenModule)).toEqual([JwtTokenService]);
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, TokenModule)).toEqual([JwtTokenService]);
  });
});

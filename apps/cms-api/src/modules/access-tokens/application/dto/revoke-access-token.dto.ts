import { ArrayUnique, IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

import { ApiPropertyOptional } from "@nestjs/swagger";

import { EXPIRES_IN_VALUES, type ExpiresIn } from "./create-access-token.dto";

export class RevokeAccessTokenDto {
  @ApiPropertyOptional({ example: "CI deploy token", description: "Falls back to the existing value when omitted." })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: [String], example: ["media:read"], description: "Falls back to the existing value when omitted." })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissions?: string[];

  @ApiPropertyOptional({ enum: EXPIRES_IN_VALUES, example: "1y", description: "Falls back to the existing value when omitted. The secret rotates regardless of what's provided." })
  @IsOptional()
  @IsIn(EXPIRES_IN_VALUES)
  expiresIn?: ExpiresIn;
}

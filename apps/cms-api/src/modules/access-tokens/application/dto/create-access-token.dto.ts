import { ArrayUnique, IsArray, IsIn, IsNotEmpty, IsString } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

export const EXPIRES_IN_VALUES = ["30m", "1h", "1d", "1m", "1y", "never"] as const;
export type ExpiresIn = (typeof EXPIRES_IN_VALUES)[number];

export class CreateAccessTokenDto {
  @ApiProperty({ example: "CI deploy token" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ type: [String], example: ["media:read"], description: "Empty array skips permission-slug validation entirely." })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissions!: string[];

  @ApiProperty({ enum: EXPIRES_IN_VALUES, example: "1y" })
  @IsIn(EXPIRES_IN_VALUES)
  expiresIn!: ExpiresIn;
}

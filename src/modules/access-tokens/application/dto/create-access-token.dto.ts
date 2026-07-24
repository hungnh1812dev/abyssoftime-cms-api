import { ArrayUnique, IsArray, IsIn, IsNotEmpty, IsString } from "class-validator";

export const EXPIRES_IN_VALUES = ["30m", "1h", "1d", "1m", "1y", "never"] as const;
export type ExpiresIn = (typeof EXPIRES_IN_VALUES)[number];

export class CreateAccessTokenDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissions!: string[];

  @IsIn(EXPIRES_IN_VALUES)
  expiresIn!: ExpiresIn;
}

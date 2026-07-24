import { ArrayUnique, IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

import { EXPIRES_IN_VALUES, type ExpiresIn } from "./create-access-token.dto";

export class RevokeAccessTokenDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissions?: string[];

  @IsOptional()
  @IsIn(EXPIRES_IN_VALUES)
  expiresIn?: ExpiresIn;
}

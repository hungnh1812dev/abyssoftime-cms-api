import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

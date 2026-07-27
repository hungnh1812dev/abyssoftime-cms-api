import { IsNotEmpty, IsOptional, IsString } from "class-validator";

import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "Jane Doe" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: "changeme123", description: "Stored as plaintext by this route (no hashing) — see users.md's known gaps." })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  password?: string;
}

import { IsEmail, IsNotEmpty, IsString } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Jane Doe" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "janedoe" })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: "changeme123", description: "Stored as plaintext by this route (no hashing) — see users.md's known gaps." })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

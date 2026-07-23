import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsBoolean()
  accountType!: boolean;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsString()
  @IsNotEmpty()
  roleId!: string;
}

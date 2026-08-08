import { ApiProperty } from "@nestjs/swagger";

export class MessageResponseDto {
  @ApiProperty({ example: "Login successful." })
  message!: string;
}

export class HasUsersResponseDto {
  @ApiProperty()
  hasUsers!: boolean;
}

export class AuthResponseDto extends MessageResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature" })
  accessToken!: string;
}

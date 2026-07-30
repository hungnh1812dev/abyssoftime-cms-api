import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { JwtTokenService } from "./jwt-token.service";

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [JwtTokenService],
  exports: [JwtTokenService],
})
export class TokenModule {}

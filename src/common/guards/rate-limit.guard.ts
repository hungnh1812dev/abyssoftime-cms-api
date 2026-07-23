import { CanActivate, type ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ ip?: string }>();
    const key = request.ip ?? "unknown";

    const fillsPerSecond = this.configService.get("RATE_LIMIT_FPS", { infer: true });
    const burst = this.configService.get("RATE_LIMIT_BURST", { infer: true });

    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { tokens: burst, lastRefillMs: now };
    const elapsedSeconds = (now - bucket.lastRefillMs) / 1000;
    const refilledTokens = Math.min(burst, bucket.tokens + elapsedSeconds * fillsPerSecond);

    if (refilledTokens < 1) {
      this.buckets.set(key, { tokens: refilledTokens, lastRefillMs: now });
      throw new HttpException("Too many requests", HttpStatus.TOO_MANY_REQUESTS);
    }

    this.buckets.set(key, { tokens: refilledTokens - 1, lastRefillMs: now });
    return true;
  }
}

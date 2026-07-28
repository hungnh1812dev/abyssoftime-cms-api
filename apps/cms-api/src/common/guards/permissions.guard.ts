import { PERMISSIONS_KEY } from "../decorators/require-permissions.decorator";
import { type AuthenticatedRequest } from "../types/authenticated-request";

import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const granted = new Set(request.user?.permissions ?? []);

    const satisfied = required.every((permission) => granted.has(permission) || granted.has(this.managerEquivalentOf(permission)));

    if (!satisfied) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }

  private managerEquivalentOf(permission: string): string {
    return permission.endsWith(":read") ? permission.replace(/:read$/, ":manager") : permission;
  }
}

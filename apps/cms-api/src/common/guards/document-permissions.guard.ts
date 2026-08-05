import { isDocumentActionGranted } from "../authorization/document-permission.util";
import { PERMISSIONS_KEY } from "../decorators/require-permissions.decorator";
import { type AuthenticatedRequest } from "../types/authenticated-request";

import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class DocumentPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const granted = request.user?.permissions ?? [];
    // Every guarded route declares a single literal ":slug" segment, never a repeatable one.
    const contentTypeSlug = request.params.slug as string;

    const satisfied = required.every((permission) => isDocumentActionGranted(granted, permission, contentTypeSlug));

    if (!satisfied) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}

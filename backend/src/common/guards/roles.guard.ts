import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const methodRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler()) ?? [];
    const classRoles = this.reflector.get<string[]>(ROLES_KEY, context.getClass()) ?? [];
    const requiredRoles = methodRoles.length > 0 ? methodRoles : classRoles;

    const methodPermissions =
      this.reflector.get<string[]>(PERMISSIONS_KEY, context.getHandler()) ?? [];
    const classPermissions =
      this.reflector.get<string[]>(PERMISSIONS_KEY, context.getClass()) ?? [];
    const requiredPermissions =
      methodPermissions.length > 0 ? methodPermissions : classPermissions;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!user.roles || !Array.isArray(user.roles)) return false;
      const ok = requiredRoles.some((role: string) => user.roles.includes(role));
      if (!ok) return false;
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!user.permissions || !Array.isArray(user.permissions)) return false;
      const ok = requiredPermissions.some((p: string) => user.permissions.includes(p));
      if (!ok) return false;
    }

    if ((!requiredRoles || requiredRoles.length === 0) && (!requiredPermissions || requiredPermissions.length === 0)) {
      return true;
    }

    return true;
  }
}


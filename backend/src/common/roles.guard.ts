import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators';
import { RoleCode } from './enums';

/**
 * Guard phân quyền theo vai trò (RBAC), đối chiếu danh sách @Roles() yêu cầu với `role_code` của người dùng.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Kiểm tra xem người dùng hiện tại có thuộc một trong các vai trò được phép truy cập route hay không.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;
    return requiredRoles.some(
      (role) => role.toLowerCase() === user.role_code.toLowerCase()
    );
  }
}

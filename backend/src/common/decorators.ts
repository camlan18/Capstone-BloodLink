import { SetMetadata } from '@nestjs/common';
import { RoleCode } from './enums';

/** Metadata key lưu danh sách vai trò được phép truy cập route. */
export const ROLES_KEY = 'roles';
/** Decorator gắn danh sách vai trò được phép truy cập controller hoặc endpoint. */
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);

/** Metadata key đánh dấu endpoint công khai không yêu cầu JWT. */
export const IS_PUBLIC_KEY = 'isPublic';
/** Decorator đánh dấu endpoint công khai bỏ qua kiểm tra JwtAuthGuard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Parameter decorator trích xuất đối tượng `request.user` đã được xác thực từ JWT. */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

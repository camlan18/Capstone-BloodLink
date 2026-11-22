import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './decorators';

/**
 * Guard xác thực JWT cho các route được bảo vệ, cho phép bỏ qua với route gắn decorator @Public().
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Kích hoạt quy trình kiểm tra JWT từ Passport AuthGuard.
   */
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /**
   * Xử lý kết quả xác thực token; cho phép đi qua nếu route là @Public() và báo UnauthorizedException nếu thiếu token hợp lệ.
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Kiểm tra metadata @Public() trên method hoặc class controller hiện tại
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu parse được user từ token thì trả về user
    if (user) return user;

    // Nếu không có user (hoặc token sai) nhưng là route public thì bỏ qua lỗi, trả về true
    // Trả về true để AuthGuard của NestJS hiểu là request được phép pass qua
    if (isPublic) return true;

    // Nếu không phải public và không có user thì văng lỗi
    throw err || new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
  }
}

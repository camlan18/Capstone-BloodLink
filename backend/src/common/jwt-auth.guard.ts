import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
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

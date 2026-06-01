import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'blood-donation-jwt-secret-key-2024-change-in-production',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: payload.sub },
      include: { role: true },
    });
    
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    return {
      user_id: user.user_id,
      email: user.email,
      role_code: user.role.role_code,
      full_name: user.full_name,
    };
  }
}

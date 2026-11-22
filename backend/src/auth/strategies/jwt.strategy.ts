import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Chiến lược Passport JWT dùng để trích xuất và xác thực Bearer token trong mỗi request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'blood-donation-jwt-secret-key-2024-change-in-production',
    });
  }

  /**
   * Kiểm tra tài khoản từ payload JWT còn tồn tại và đang hoạt động hay không, trả về thông tin user gắn vào `req.user`.
   */
  async validate(payload: any) {
    // Truy vấn lại user theo sub trong token để đảm bảo tài khoản chưa bị xóa hoặc bị khóa sau khi cấp token
    const user = await this.prisma.users.findUnique({
      where: { user_id: payload.sub },
      include: { role: true },
    });
    
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    // Gắn thông tin phân quyền chuẩn hóa vào req.user cho các Guard và Controller phía sau
    return {
      user_id: user.user_id,
      email: user.email,
      role_code: user.role.role_code,
      full_name: user.full_name,
      facility_id: user.facility_id,
    };
  }
}

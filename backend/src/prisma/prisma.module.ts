import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Module toàn cục cung cấp và export PrismaService để kết nối cơ sở dữ liệu cho các module khác.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

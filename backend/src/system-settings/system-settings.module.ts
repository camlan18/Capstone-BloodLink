import { Module } from '@nestjs/common';
import { SystemSettingsController } from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Module quản lý các tham số cấu hình động của hệ thống.
 */
@Module({
  imports: [PrismaModule],
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService]
})
export class SystemSettingsModule {}

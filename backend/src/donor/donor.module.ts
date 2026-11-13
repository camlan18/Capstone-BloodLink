import { Module } from '@nestjs/common';
import { DonorService } from './donor.service';
import { DonorController } from './donor.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

/**
 * Module quản lý người hiến máu: hồ sơ, đặt lịch, lịch sử hiến máu, chứng nhận và bảng xếp hạng.
 */
@Module({
  imports: [NotificationsModule, SystemSettingsModule],
  controllers: [DonorController],
  providers: [DonorService],
  exports: [DonorService],
})
export class DonorModule {}

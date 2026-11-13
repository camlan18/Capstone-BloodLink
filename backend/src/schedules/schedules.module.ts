import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Module quản lý lịch tổ chức hiến máu và danh sách người đăng ký theo từng lịch.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}

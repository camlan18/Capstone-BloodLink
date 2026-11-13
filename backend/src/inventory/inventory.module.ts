import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Module quản lý kho máu: nhập kho, cập nhật, hủy, điều chuyển và thống kê túi máu.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

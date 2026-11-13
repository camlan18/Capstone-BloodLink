import { Module } from '@nestjs/common';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Module xử lý điều phối và luân chuyển túi máu giữa các cơ sở y tế / ngân hàng máu.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [TransferController],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}

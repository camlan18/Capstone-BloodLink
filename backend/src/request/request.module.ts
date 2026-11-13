import { Module } from '@nestjs/common';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

/**
 * Module quản lý toàn bộ luồng yêu cầu nhận máu, ghép nối người hiến và cấp phát túi máu từ kho.
 */
@Module({
  imports: [NotificationsModule, MailModule],
  controllers: [RequestController],
  providers: [RequestService],
})
export class RequestModule {}

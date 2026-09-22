import { Module } from '@nestjs/common';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [NotificationsModule, MailModule],
  controllers: [RequestController],
  providers: [RequestService],
})
export class RequestModule {}

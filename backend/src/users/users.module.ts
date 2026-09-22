import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [CloudinaryModule, MailModule, NotificationsModule, SystemSettingsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

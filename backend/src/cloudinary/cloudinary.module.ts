import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryController } from './cloudinary.controller';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

/**
 * Module tích hợp Cloudinary phục vụ tải lên và lưu trữ hình ảnh.
 */
@Module({
  imports: [SystemSettingsModule],
  controllers: [CloudinaryController],
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryProvider, CloudinaryService],
})
export class CloudinaryModule {}

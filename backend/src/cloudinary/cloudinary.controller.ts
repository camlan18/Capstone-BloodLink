import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { Roles } from '../common/decorators';
import { RoleCode, SystemSettingKey } from '../common/enums';
import { SystemSettingsService } from '../system-settings/system-settings.service';

/**
 * Controller cung cấp API tải ảnh lên Cloudinary.
 */
@Controller('api/v1/upload')
export class CloudinaryController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly systemSettingsService: SystemSettingsService
  ) {}

  /**
   * Tải một tệp hình ảnh lên Cloudinary sau khi kiểm tra giới hạn dung lượng hệ thống.
   */
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    // B1: Kiểm tra tệp đính kèm và đọc ngưỡng MB tối đa từ cấu hình hệ thống trước khi đẩy lên Cloudinary
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh');
    const maxMbStr = await this.systemSettingsService.getSettingValue(SystemSettingKey.MAX_IMAGE_UPLOAD_SIZE_MB, '5');
    const maxMb = parseFloat(maxMbStr) || 5;
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`Dung lượng file vượt quá giới hạn cho phép (${maxMb}MB)`);
    }
    // B2: Tải stream lên Cloudinary và trả về secure_url công khai
    const result = await this.cloudinaryService.uploadFile(file);
    return { url: result.secure_url };
  }
}

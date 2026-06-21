import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';

@Controller('api/v1/upload')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR, RoleCode.STAFF)
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh');
    const result = await this.cloudinaryService.uploadFile(file);
    return { url: result.secure_url };
  }
}

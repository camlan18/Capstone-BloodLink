import { Module } from '@nestjs/common';
import { EducationController } from './education.controller';
import { EducationService } from './education.service';

/**
 * Module quản lý tài liệu và danh mục giáo dục kiến thức hiến máu.
 */
@Module({
  controllers: [EducationController],
  providers: [EducationService],
})
export class EducationModule {}

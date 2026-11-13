import { Module } from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { MasterDataController } from './master-data.controller';

/**
 * Module quản lý dữ liệu danh mục: nhóm máu, thành phần máu, độ tương thích, cơ sở y tế và quy tắc hiến máu.
 */
@Module({
  controllers: [MasterDataController],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}

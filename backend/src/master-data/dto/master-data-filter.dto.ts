import { IsOptional, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/pagination.dto';

/**
 * DTO lọc và phân trang danh mục dữ liệu chuẩn theo trạng thái hoạt động.
 */
export class MasterDataFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  is_active?: boolean;
}

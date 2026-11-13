import { IsInt, IsNotEmpty, IsString, IsArray, ArrayNotEmpty, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO cập nhật trạng thái ghép nối người hiến máu cho yêu cầu cần máu.
 */
export class UpdateMatchStatusDto {
  @ApiProperty({ example: 'CONTACTED', description: 'Trạng thái ghép nối (VD: PENDING, CONTACTED, ACCEPTED, REJECTED)' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['PENDING', 'CONTACTED', 'ACCEPTED', 'REJECTED'])
  status: string;
}

/**
 * DTO cấp phát một hoặc nhiều túi máu từ kho máu cho yêu cầu cần máu.
 */
export class AllocateInventoryDto {
  @ApiProperty({ example: [1, 2, 3], description: 'Danh sách ID của các túi máu trong kho muốn cấp phát' })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  inventory_ids: number[];
}

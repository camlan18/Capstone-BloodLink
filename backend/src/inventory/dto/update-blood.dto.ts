import { PartialType } from '@nestjs/swagger';
import { ReceiveBloodDto } from './receive-blood.dto';

/**
 * DTO cập nhật thông tin túi máu (kế thừa tùy chọn các trường từ ReceiveBloodDto).
 */
export class UpdateBloodDto extends PartialType(ReceiveBloodDto) {}

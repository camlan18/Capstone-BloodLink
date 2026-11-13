import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO chứa lý do hủy túi máu khỏi kho máu.
 */
export class DiscardBloodDto {
  @ApiProperty({ example: 'Túi máu bị hỏng trong quá trình vận chuyển', description: 'Lý do hủy túi máu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

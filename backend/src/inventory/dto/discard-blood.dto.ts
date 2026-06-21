import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DiscardBloodDto {
  @ApiProperty({ example: 'Túi máu bị hỏng trong quá trình vận chuyển', description: 'Lý do hủy túi máu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

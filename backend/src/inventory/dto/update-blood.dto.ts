import { PartialType } from '@nestjs/swagger';
import { ReceiveBloodDto } from './receive-blood.dto';

export class UpdateBloodDto extends PartialType(ReceiveBloodDto) {}

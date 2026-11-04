import { IsInt, IsOptional, IsString, Min, IsDateString } from 'class-validator';

export class CreateTransferDto {
  @IsInt()
  from_facility_id: number;

  @IsInt()
  to_facility_id: number;

  @IsInt()
  blood_type_id: number;

  @IsInt()
  component_id: number;

  @IsOptional()
  @IsInt()
  inventory_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  units_requested?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @IsDateString()
  required_before?: string;
}

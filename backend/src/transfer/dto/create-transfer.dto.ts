import { IsInt, IsOptional, IsString, Min, IsDateString } from 'class-validator';

/**
 * DTO khởi tạo yêu cầu điều chuyển túi máu giữa hai cơ sở y tế.
 */
export class CreateTransferDto {
  /** ID cơ sở y tế nguồn (nơi cung cấp máu). */
  @IsInt()
  from_facility_id: number;

  /** ID cơ sở y tế đích (nơi nhận máu). */
  @IsInt()
  to_facility_id: number;

  /** ID nhóm máu cần điều chuyển. */
  @IsInt()
  blood_type_id: number;

  /** ID thành phần máu cần điều chuyển. */
  @IsInt()
  component_id: number;

  /** ID túi máu cụ thể (nếu chỉ định sẵn khi tạo phiếu). */
  @IsOptional()
  @IsInt()
  inventory_id?: number;

  /** Số lượng đơn vị máu cần điều chuyển (tối thiểu 1). */
  @IsOptional()
  @IsInt()
  @Min(1)
  units_requested?: number;

  /** Lý do yêu cầu điều chuyển máu. */
  @IsOptional()
  @IsString()
  reason?: string;

  /** Ghi chú bổ sung kèm theo phiếu chuyển. */
  @IsOptional()
  @IsString()
  notes?: string;

  /** Hạn chót cần nhận máu (chuỗi ngày chuẩn ISO 8601). */
  @IsOptional()
  @IsString()
  @IsDateString()
  required_before?: string;
}

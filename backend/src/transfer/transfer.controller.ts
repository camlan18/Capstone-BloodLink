import { Controller, Post, Put, Get, Body, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';

/**
 * Controller quản lý vòng đời phiếu điều chuyển máu giữa các cơ sở y tế:
 * tạo phiếu, duyệt, xuất kho, vận chuyển, nhận hàng loạt/đơn lẻ, từ chối và hủy phiếu.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  /** Tạo yêu cầu điều chuyển máu mới từ cơ sở nguồn sang cơ sở đích. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post()
  async createTransfer(@Req() req: any, @Body() dto: CreateTransferDto) {
    return await this.transferService.createTransfer(dto, req.user);
  }

  /** Lấy danh sách phiếu điều chuyển máu theo bộ lọc và quyền cơ sở của người dùng. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get()
  async getTransfers(@Query() query: any, @Req() req: any) {
    return await this.transferService.getTransfers(query, req.user);
  }

  /** Xem thông tin chi tiết một phiếu điều chuyển máu theo ID. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get(':id')
  async getTransferById(@Param('id', ParseIntPipe) id: number) {
    return await this.transferService.getTransferById(id);
  }

  /** Phê duyệt phiếu điều chuyển và gắn danh sách túi máu xuất kho tương ứng. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/approve')
  async approveTransfer(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { inventory_ids?: number[] },
  ) {
    return await this.transferService.approveTransfer(id, req.user, body.inventory_ids);
  }

  /** Chuyển trạng thái phiếu sang đang vận chuyển (IN_TRANSIT). */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/ship')
  async shipTransfer(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.transferService.shipTransfer(id, req.user);
  }

  /** Xác nhận đơn vị vận chuyển đã giao máu tới cơ sở đích. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/deliver')
  async deliverTransfer(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.transferService.deliverTransfer(id, req.user);
  }

  /** Xác nhận nhập kho hàng loạt nhiều phiếu điều chuyển đã giao tới cơ sở nhận. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post('receive-batch')
  async receiveBatchTransfers(
    @Req() req: any,
    @Body() body: { transfer_ids: number[] },
  ) {
    return await this.transferService.receiveBatchTransfers(body.transfer_ids, req.user);
  }

  /** Xác nhận cơ sở đích đã nhận máu và cập nhật túi máu vào kho của cơ sở nhận. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/receive')
  async receiveTransfer(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.transferService.receiveTransfer(id, req.user);
  }

  /** Từ chối phiếu điều chuyển kèm lý do và hoàn trả trạng thái túi máu về AVAILABLE (nếu đã duyệt). */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/reject')
  async rejectTransfer(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
  ) {
    return await this.transferService.rejectTransfer(id, req.user, body.reason);
  }

  /** Hủy phiếu điều chuyển máu trước khi hoàn tất giao nhận. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/cancel')
  async cancelTransfer(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.transferService.cancelTransfer(id, req.user);
  }
}

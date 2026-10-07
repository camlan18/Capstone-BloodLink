import { Controller, Post, Put, Get, Body, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post()
  async createTransfer(@Req() req: any, @Body() dto: CreateTransferDto) {
    return await this.transferService.createTransfer(dto, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get()
  async getTransfers(@Query() query: any, @Req() req: any) {
    return await this.transferService.getTransfers(query, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get(':id')
  async getTransferById(@Param('id', ParseIntPipe) id: number) {
    return await this.transferService.getTransferById(id);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/approve')
  async approveTransfer(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { inventory_ids?: number[] },
  ) {
    return await this.transferService.approveTransfer(id, req.user, body.inventory_ids);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/ship')
  async shipTransfer(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.transferService.shipTransfer(id, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/receive')
  async receiveTransfer(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.transferService.receiveTransfer(id, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/reject')
  async rejectTransfer(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
  ) {
    return await this.transferService.rejectTransfer(id, req.user, body.reason);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/cancel')
  async cancelTransfer(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.transferService.cancelTransfer(id, req.user);
  }
}

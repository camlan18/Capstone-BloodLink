import { Controller, Post, Put, Body, Param, ParseIntPipe, Get, Req, UseGuards, Query, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ReceiveBloodDto } from './dto/receive-blood.dto';
import { DiscardBloodDto } from './dto/discard-blood.dto';
import { Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Post('receive')
  async receiveBlood(@Req() req: any, @Body() dto: ReceiveBloodDto) {
    return await this.inventoryService.receiveBlood({
      ...dto,
      staff_user_id: req.user.user_id,
    });
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Put(':id')
  async updateBlood(
    @Req() req: any,
    @Param('id', ParseIntPipe) inventoryId: number,
    @Body() dto: Partial<ReceiveBloodDto>,
  ) {
    return await this.inventoryService.updateBlood(inventoryId, dto, req.user.user_id);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Post(':id/discard')
  async discardBlood(
    @Req() req: any,
    @Param('id', ParseIntPipe) inventoryId: number,
    @Body() dto: DiscardBloodDto,
  ) {
    return await this.inventoryService.discardBlood(inventoryId, req.user.user_id, dto.reason);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Get('stats')
  async getStats() {
    return await this.inventoryService.getInventoryStats();
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Get()
  async getInventoryList(@Query() query: any) {
    return await this.inventoryService.getInventoryList(query);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Get('export')
  async exportExcel(@Query() query: any, @Res() res: Response) {
    const buffer = await this.inventoryService.exportExcel(query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory.xlsx');
    res.send(buffer);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.inventoryService.getTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_template.xlsx');
    res.send(buffer);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Vui lòng chọn file Excel');
    return await this.inventoryService.importExcel(file.buffer, req.user.user_id);
  }
}

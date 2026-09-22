import { Controller, Post, Put, Delete, Body, Param, ParseIntPipe, Get, Req, UseGuards, Query, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { RequestService } from './request.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateMatchStatusDto, AllocateInventoryDto } from './dto/matching-allocation.dto';
import { Roles, Public } from '../common/decorators';
import { RoleCode } from '../common/enums';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/requests')
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post()
  async createRequest(@Req() req: any, @Body() dto: CreateRequestDto) {
    return await this.requestService.createRequest(dto, req.user);
  }

  @Public()
  @Post('public')
  async createPublicRequest(@Req() req: any, @Body() dto: CreateRequestDto) {
    const userId = req.user && req.user.user_id ? req.user.user_id : null;
    return await this.requestService.createPublicRequest(dto, userId);
  }

  @Public()
  @Get('public')
  async getPublicRequests(@Query() query: any) {
    query.is_public_view = true;
    return await this.requestService.getRequests(query);
  }

  @Public()
  @Get('public/code/:code')
  async getPublicRequestByCode(@Param('code') code: string) {
    return await this.requestService.getRequestByCode(code);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/process')
  async processRequest(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.requestService.processRequest(id, req.user);
  }

  @Get('my')
  async getMyRequests(@Req() req: any, @Query() query: any) {
    const userId = req.user.user_id;
    return await this.requestService.getRequests({ ...query, requester_user_id: userId });
  }

  @Get('my/:id')
  async getMyRequestDetail(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.user_id;
    return await this.requestService.getRequestById(id, userId);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get()
  async getRequests(@Query() query: any, @Req() req: any) {
    return await this.requestService.getRequests(query, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get('export')
  async exportExcel(@Query() query: any, @Res() res: Response, @Req() req: any) {
    const buffer = await this.requestService.exportExcel(query, req.user);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=requests.xlsx');
    res.send(buffer);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.requestService.getTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=requests_template.xlsx');
    res.send(buffer);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Vui lòng chọn file Excel');
    return await this.requestService.importExcel(file.buffer, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Put(':id')
  async updateRequest(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateRequestDto>) {
    return await this.requestService.updateRequest(id, dto, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Delete(':id')
  async deleteRequest(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.requestService.deleteRequest(id, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/cancel')
  async cancelRequest(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.requestService.cancelRequest(id, req.user);
  }

  // --- MATCHING & ALLOCATION (ADMIN ONLY) ---

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get(':id/matches')
  async getMatches(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.requestService.getMatches(id, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/matches/find')
  async findDonorMatches(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.requestService.findDonorMatches(id, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Put('matches/:matchId/status')
  async updateMatchStatus(@Req() req: any, @Param('matchId', ParseIntPipe) matchId: number, @Body() dto: UpdateMatchStatusDto) {
    return await this.requestService.updateMatchStatus(matchId, dto.status, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get(':id/allocations')
  async getAllocations(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.requestService.getAllocations(id, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/allocations')
  async allocateInventory(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: AllocateInventoryDto) {
    return await this.requestService.allocateInventory(id, dto.inventory_ids, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Delete('allocations/:allocationId')
  async releaseAllocation(@Req() req: any, @Param('allocationId', ParseIntPipe) allocationId: number) {
    return await this.requestService.releaseAllocation(allocationId, req.user);
  }
}

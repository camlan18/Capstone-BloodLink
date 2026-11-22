import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto, ScheduleFilterDto } from './dto/schedules.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles, CurrentUser } from '../common/decorators';
import { RoleCode } from '../common/enums';

/**
 * Controller quản lý API lịch tổ chức hiến máu và danh sách người hiến máu theo lịch.
 */
@Controller('api/v1/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  /**
   * Lấy danh sách lịch tổ chức hiến máu có lọc và phân trang.
   */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get()
  async getAllSchedules(@Query() query: ScheduleFilterDto, @CurrentUser() user: any) {
    return await this.schedulesService.getAllSchedules(query, user);
  }

  /**
   * Lấy thông tin chi tiết một lịch hiến máu theo ID.
   */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get(':id')
  async getScheduleById(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return await this.schedulesService.getScheduleById(id, user);
  }

  /**
   * Tạo mới một lịch tổ chức hiến máu.
   */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post()
  async createSchedule(@Body() dto: CreateScheduleDto, @CurrentUser() user: any) {
    return await this.schedulesService.createSchedule(dto, user);
  }

  /**
   * Cập nhật thông tin lịch tổ chức hiến máu theo ID.
   */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Put(':id')
  async updateSchedule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScheduleDto, @CurrentUser() user: any) {
    return await this.schedulesService.updateSchedule(id, dto, user);
  }

  /**
   * Xóa một lịch tổ chức hiến máu theo ID.
   */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Delete(':id')
  async deleteSchedule(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return await this.schedulesService.deleteSchedule(id, user);
  }

  /**
   * Lấy danh sách người đăng ký tham gia một lịch hiến máu cụ thể.
   */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get(':id/donors')
  async getScheduleDonors(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: any,
    @CurrentUser() user: any
  ) {
    return await this.schedulesService.getScheduleDonors(id, query, user);
  }

  /**
   * Cập nhật trạng thái tham gia của người hiến máu trong lịch hẹn.
   */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Put(':id/donors/:slotId/status')
  async updateDonorStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Body('status') status: string,
    @CurrentUser() user: any
  ) {
    return await this.schedulesService.updateDonorStatus(id, slotId, status, user);
  }

  /**
   * Xuất danh sách người đăng ký hiến máu theo lịch ra tệp Excel.
   */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get(':id/donors/export')
  async exportScheduleDonors(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @CurrentUser() user: any) {
    // Xuất danh sách slot đăng ký ra buffer Excel và mã hóa tên tệp tiếng Việt theo chuẩn RFC 5987
    const { buffer, filename } = await this.schedulesService.exportScheduleDonors(id, user);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    return res.send(buffer);
  }
}

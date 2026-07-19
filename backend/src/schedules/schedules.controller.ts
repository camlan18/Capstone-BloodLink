import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto, ScheduleFilterDto } from './dto/schedules.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles, CurrentUser } from '../common/decorators';
import { RoleCode } from '../common/enums';

@Controller('api/v1/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Roles(RoleCode.ADMIN, RoleCode.FACILITY_ADMIN)
  @Get()
  async getAllSchedules(@Query() query: ScheduleFilterDto, @CurrentUser() user: any) {
    return await this.schedulesService.getAllSchedules(query, user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.FACILITY_ADMIN)
  @Get(':id')
  async getScheduleById(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return await this.schedulesService.getScheduleById(id, user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.FACILITY_ADMIN)
  @Post()
  async createSchedule(@Body() dto: CreateScheduleDto, @CurrentUser() user: any) {
    return await this.schedulesService.createSchedule(dto, user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.FACILITY_ADMIN)
  @Put(':id')
  async updateSchedule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScheduleDto, @CurrentUser() user: any) {
    return await this.schedulesService.updateSchedule(id, dto, user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.FACILITY_ADMIN)
  @Delete(':id')
  async deleteSchedule(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return await this.schedulesService.deleteSchedule(id, user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.FACILITY_ADMIN)
  @Get(':id/donors')
  async getScheduleDonors(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: any,
    @CurrentUser() user: any
  ) {
    return await this.schedulesService.getScheduleDonors(id, query, user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.FACILITY_ADMIN)
  @Put(':id/donors/:slotId/status')
  async updateDonorStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Body('status') status: string,
    @CurrentUser() user: any
  ) {
    return await this.schedulesService.updateDonorStatus(id, slotId, status, user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.FACILITY_ADMIN)
  @Get(':id/donors/export')
  async exportScheduleDonors(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @CurrentUser() user: any) {
    const { buffer, filename } = await this.schedulesService.exportScheduleDonors(id, user);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    return res.send(buffer);
  }
}

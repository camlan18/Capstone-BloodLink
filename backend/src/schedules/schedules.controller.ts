import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto, ScheduleFilterDto } from './dto/schedules.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';

@Controller('api/v1/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Get()
  async getAllSchedules(@Query() query: ScheduleFilterDto) {
    return await this.schedulesService.getAllSchedules(query);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Get(':id')
  async getScheduleById(@Param('id', ParseIntPipe) id: number) {
    return await this.schedulesService.getScheduleById(id);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Post()
  async createSchedule(@Body() dto: CreateScheduleDto) {
    return await this.schedulesService.createSchedule(dto);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Put(':id')
  async updateSchedule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScheduleDto) {
    return await this.schedulesService.updateSchedule(id, dto);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Delete(':id')
  async deleteSchedule(@Param('id', ParseIntPipe) id: number) {
    return await this.schedulesService.deleteSchedule(id);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Get(':id/donors')
  async getScheduleDonors(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: any
  ) {
    return await this.schedulesService.getScheduleDonors(id, query);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Put(':id/donors/:slotId/status')
  async updateDonorStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Body('status') status: string
  ) {
    return await this.schedulesService.updateDonorStatus(id, slotId, status);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Get(':id/donors/export')
  async exportScheduleDonors(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { buffer, filename } = await this.schedulesService.exportScheduleDonors(id);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    return res.send(buffer);
  }
}

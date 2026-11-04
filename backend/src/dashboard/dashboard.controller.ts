import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles, CurrentUser } from '../common/decorators';
import { RoleCode } from '../common/enums';

@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF, RoleCode.MODERATOR)
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('facilityId') facilityId?: string,
    @CurrentUser() user?: any,
  ) {
    return await this.dashboardService.getStats(startDate, endDate, facilityId, user);
  }
  @Get('export-report')
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF, RoleCode.MODERATOR)
  async exportReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('facilityId') facilityId?: string,
    @CurrentUser() user?: any,
    @Res() res?: Response
  ) {
    const buffer = await this.dashboardService.exportReport(startDate, endDate, facilityId, user);
    if (res) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoHeThong.xlsx');
      res.send(buffer);
    }
    return buffer;
  }
}

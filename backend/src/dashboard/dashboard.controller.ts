import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.FACILITY_ADMIN)
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('facilityId') facilityId?: string,
    @CurrentUser() user?: any,
  ) {
    return await this.dashboardService.getStats(startDate, endDate, facilityId, user);
  }
}

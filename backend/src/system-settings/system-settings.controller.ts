import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { UpsertSettingDto } from './dto/system-settings.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';

/**
 * Controller quản lý API cấu hình tham số hệ thống (dành cho quản trị viên).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/system-settings')
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  /**
   * Lấy danh sách cấu hình hệ thống theo bộ lọc truy vấn.
   */
  @Roles(RoleCode.ADMIN)
  @Get()
  async getSettings(@Query() query: any) {
    return await this.systemSettingsService.getSettings(query);
  }

  /**
   * Tạo mới hoặc cập nhật giá trị một khóa cấu hình hệ thống.
   */
  @Roles(RoleCode.ADMIN)
  @Post()
  async upsertSetting(@Body() dto: UpsertSettingDto) {
    return await this.systemSettingsService.upsertSetting(dto);
  }

  /**
   * Xóa một cấu hình hệ thống theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Delete(':id')
  async deleteSetting(@Param('id', ParseIntPipe) id: number) {
    return await this.systemSettingsService.deleteSetting(id);
  }
}

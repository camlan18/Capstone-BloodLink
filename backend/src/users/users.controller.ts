import { Controller, Get, Post, Put, Delete, Body, Param, Req, Query, UseGuards, ParseIntPipe, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';
import { PaginationDto } from '../common/pagination.dto';
import { ChangePasswordVerifyDto, CreateUserAdminDto, UpdateUserAdminDto } from './dto/users.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { SystemSettingKey } from '../common/enums';

/**
 * Controller cung cấp API quản lý hồ sơ cá nhân và quản trị danh sách người dùng.
 */
@Controller('api/v1/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly systemSettingsService: SystemSettingsService
  ) {}

  /**
   * Lấy thông tin hồ sơ của người dùng đang đăng nhập.
   */
  @Get('profile')
  async getProfile(@Req() req: any) {
    return await this.usersService.getProfile(req.user.user_id);
  }

  /**
   * Cập nhật thông tin hồ sơ cá nhân của người dùng hiện tại.
   */
  @Put('profile')
  async updateProfile(@Req() req: any, @Body() body: any) {
    return await this.usersService.updateProfile(req.user.user_id, body);
  }

  /**
   * Tải ảnh đại diện mới cho người dùng sau khi kiểm tra giới hạn dung lượng.
   */
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    // Đọc ngưỡng dung lượng ảnh tối đa từ system_settings (mặc định 5MB) trước khi cho upload lên Cloudinary
    const maxMbStr = await this.systemSettingsService.getSettingValue(SystemSettingKey.MAX_IMAGE_UPLOAD_SIZE_MB, '5');
    const maxMb = parseFloat(maxMbStr) || 5;
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`Dung lượng file vượt quá giới hạn cho phép (${maxMb}MB)`);
    }
    return await this.usersService.uploadAvatar(req.user.user_id, file);
  }

  /**
   * Gửi mã OTP qua email để xác nhận yêu cầu đổi mật khẩu.
   */
  @Post('change-password-otp')
  async requestChangePasswordOtp(@Req() req: any) {
    return await this.usersService.sendChangePasswordOtp(req.user.user_id);
  }

  /**
   * Xác nhận OTP và thay đổi mật khẩu cho tài khoản đang đăng nhập.
   */
  @Put('change-password')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordVerifyDto) {
    return await this.usersService.changePassword(req.user.user_id, dto);
  }

  /**
   * Lấy danh sách người dùng có lọc và phân trang (dành cho Admin/Staff).
   */
  // Admin Only
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get()
  async getAllUsers(@Query() query: UserFilterDto) {
    return await this.usersService.getAllUsers(query);
  }

  /**
   * Xuất danh sách người dùng ra tệp Excel.
   */
  @Roles(RoleCode.ADMIN)
  @Get('export')
  async exportExcel(@Query() query: UserFilterDto, @Res() res: Response) {
    const buffer = await this.usersService.exportExcel(query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    res.send(buffer);
  }

  /**
   * Tải tệp Excel mẫu để nhập danh sách người dùng hàng loạt.
   */
  @Roles(RoleCode.ADMIN)
  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.usersService.getTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users_template.xlsx');
    res.send(buffer);
  }

  /**
   * Nhập danh sách tài khoản người dùng từ tệp Excel.
   */
  @Roles(RoleCode.ADMIN)
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Vui lòng chọn file Excel');
    return await this.usersService.importExcel(file.buffer, req.user.user_id);
  }

  /**
   * Lấy thông tin chi tiết một người dùng theo ID.
   */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.getUserById(id);
  }

  /**
   * Quản trị viên tạo mới tài khoản người dùng.
   */
  @Roles(RoleCode.ADMIN)
  @Post()
  async createUser(@Body() dto: CreateUserAdminDto) {
    return await this.usersService.createUserAdmin(dto);
  }

  /**
   * Quản trị viên cập nhật thông tin tài khoản người dùng theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Put(':id')
  async updateUser(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserAdminDto) {
    return await this.usersService.updateUserAdmin(id, dto);
  }

  /**
   * Khóa hoặc mở khóa tài khoản người dùng theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Put(':id/lock')
  async toggleLockUser(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.toggleLockUser(id);
  }
}

import { Controller, Get, Post, Put, Delete, Body, Param, Req, Query, UseGuards, ParseIntPipe, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';
import { PaginationDto } from '../common/pagination.dto';
import { ChangePasswordVerifyDto, CreateUserAdminDto, UpdateUserAdminDto } from './dto/users.dto';
import { UserFilterDto } from './dto/user-filter.dto';

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Req() req: any) {
    return await this.usersService.getProfile(req.user.user_id);
  }

  @Put('profile')
  async updateProfile(@Req() req: any, @Body() body: any) {
    return await this.usersService.updateProfile(req.user.user_id, body);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return await this.usersService.uploadAvatar(req.user.user_id, file);
  }

  @Post('change-password-otp')
  async requestChangePasswordOtp(@Req() req: any) {
    return await this.usersService.sendChangePasswordOtp(req.user.user_id);
  }

  @Put('change-password')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordVerifyDto) {
    return await this.usersService.changePassword(req.user.user_id, dto);
  }

  // Admin Only
  @Roles(RoleCode.ADMIN)
  @Get()
  async getAllUsers(@Query() query: UserFilterDto) {
    return await this.usersService.getAllUsers(query);
  }

  @Roles(RoleCode.ADMIN)
  @Get('export')
  async exportExcel(@Query() query: UserFilterDto, @Res() res: Response) {
    const buffer = await this.usersService.exportExcel(query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    res.send(buffer);
  }

  @Roles(RoleCode.ADMIN)
  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.usersService.getTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users_template.xlsx');
    res.send(buffer);
  }

  @Roles(RoleCode.ADMIN)
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Vui lòng chọn file Excel');
    return await this.usersService.importExcel(file.buffer, req.user.user_id);
  }

  @Roles(RoleCode.ADMIN)
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.getUserById(id);
  }

  @Roles(RoleCode.ADMIN)
  @Post()
  async createUser(@Body() dto: CreateUserAdminDto) {
    return await this.usersService.createUserAdmin(dto);
  }

  @Roles(RoleCode.ADMIN)
  @Put(':id')
  async updateUser(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserAdminDto) {
    return await this.usersService.updateUserAdmin(id, dto);
  }

  @Roles(RoleCode.ADMIN)
  @Put(':id/lock')
  async toggleLockUser(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.toggleLockUser(id);
  }
}

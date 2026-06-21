import { Controller, Post, Get, Delete, Param, Body, Query, UseGuards, ParseIntPipe, Put, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my')
  async getMyNotifications(@Req() req: any, @Query() query: any) {
    const userId = req.user.user_id;
    return await this.notificationsService.getNotifications({ ...query, user_id: userId });
  }

  @Get('my/unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.user_id;
    return await this.notificationsService.getUnreadCount(userId);
  }

  @Put('my/mark-all-read')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.user_id;
    return await this.notificationsService.markAllAsRead(userId);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Post()
  async createNotification(@Body() dto: CreateNotificationDto) {
    return await this.notificationsService.createNotification(dto);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Get()
  async getNotifications(@Query() query: any) {
    return await this.notificationsService.getNotifications(query);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Delete(':id')
  async deleteNotification(@Param('id', ParseIntPipe) id: number) {
    return await this.notificationsService.deleteNotification(id);
  }

  @Put(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return await this.notificationsService.markAsRead(id);
  }
}

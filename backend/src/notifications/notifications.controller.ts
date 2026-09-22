import { Controller, Post, Get, Delete, Param, Body, Query, UseGuards, ParseIntPipe, Put, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';
import { MailService } from '../mail/mail.service';
import { Public } from '../common/decorators';
import { NotificationType } from './notifications.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService
  ) {}

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

  @Public()
  @Post('contact')
  async submitContactForm(@Body() dto: any) {
    await this.mailService.sendContactEmail(
      dto.email,
      dto.name,
      dto.subject,
      dto.message
    );
    
    await this.notificationsService.notifyAdmins(
      'Liên hệ mới từ người dùng',
      `Người dùng ${dto.name} (${dto.email}, SĐT: ${dto.phone}) vừa gửi liên hệ với chủ đề: ${dto.subject}\n\nNội dung:\n${dto.message}`,
      NotificationType.INFO,
      'CONTACT'
    );
    
    return { success: true, message: 'Đã gửi liên hệ thành công' };
  }
}

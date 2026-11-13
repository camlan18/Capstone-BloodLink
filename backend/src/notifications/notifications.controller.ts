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

/**
 * Controller cung cấp API thông báo của người dùng, quản trị thông báo và gửi liên hệ.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService
  ) {}

  /**
   * Lấy danh sách thông báo của người dùng đang đăng nhập.
   */
  @Get('my')
  async getMyNotifications(@Req() req: any, @Query() query: any) {
    const userId = req.user.user_id;
    return await this.notificationsService.getNotifications({ ...query, user_id: userId });
  }

  /**
   * Đếm số lượng thông báo chưa đọc của người dùng hiện tại.
   */
  @Get('my/unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.user_id;
    return await this.notificationsService.getUnreadCount(userId);
  }

  /**
   * Đánh dấu toàn bộ thông báo của người dùng hiện tại là đã đọc.
   */
  @Put('my/mark-all-read')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.user_id;
    return await this.notificationsService.markAllAsRead(userId);
  }

  /**
   * Tạo và gửi thông báo tới danh sách người dùng chỉ định.
   */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Post()
  async createNotification(@Body() dto: CreateNotificationDto) {
    return await this.notificationsService.createNotification(dto);
  }

  /**
   * Lấy danh sách tất cả thông báo trong hệ thống (dành cho Admin/Staff).
   */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Get()
  async getNotifications(@Query() query: any) {
    return await this.notificationsService.getNotifications(query);
  }

  /**
   * Xóa một thông báo theo ID.
   */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @Delete(':id')
  async deleteNotification(@Param('id', ParseIntPipe) id: number) {
    return await this.notificationsService.deleteNotification(id);
  }

  /**
   * Đánh dấu một thông báo cụ thể là đã đọc.
   */
  @Put(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return await this.notificationsService.markAsRead(id);
  }

  /**
   * Tiếp nhận biểu mẫu liên hệ công khai, gửi email và thông báo tới quản trị viên.
   */
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

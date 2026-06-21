import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  SYSTEM = 'SYSTEM',
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(dto: CreateNotificationDto) {
    if (!dto.user_ids || dto.user_ids.length === 0) {
      throw new Error('Cần chọn ít nhất 1 người dùng để gửi thông báo');
    }

    const data = dto.user_ids.map(user_id => ({
      user_id,
      title: dto.title,
      message: dto.message,
      notification_type: dto.notification_type,
      reference_type: dto.reference_type,
      reference_id: dto.reference_id,
      is_read: false
    }));

    const result = await this.prisma.notifications.createMany({
      data
    });

    return { message: `Đã gửi thành công ${result.count} thông báo` };
  }

  async notifyAdmins(title: string, message: string, type: string = NotificationType.SYSTEM, reference_type?: string, reference_id?: number) {
    const admins = await this.prisma.users.findMany({
      where: {
        role: {
          role_code: 'admin' // RoleCode.ADMIN is 'admin'
        },
        is_active: true
      },
      select: { user_id: true }
    });

    if (admins.length > 0) {
      await this.createNotification({
        user_ids: admins.map(a => a.user_id),
        title,
        message,
        notification_type: type,
        reference_type,
        reference_id
      });
    }
  }

  async getNotifications(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.user_id) where.user_id = Number(query.user_id);
    if (query.notification_type) where.notification_type = query.notification_type;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { message: { contains: query.search } }
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        include: {
          user: { select: { full_name: true, email: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notifications.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async deleteNotification(id: number) {
    const notif = await this.prisma.notifications.findUnique({ where: { notification_id: id } });
    if (!notif) throw new NotFoundException('Không tìm thấy thông báo');
    
    return await this.prisma.notifications.delete({ where: { notification_id: id } });
  }

  async markAsRead(id: number) {
    return await this.prisma.notifications.update({
      where: { notification_id: id },
      data: { is_read: true, read_at: new Date() }
    });
  }

  async getUnreadCount(userId: number) {
    const count = await this.prisma.notifications.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });
    return { unread_count: count };
  }

  async markAllAsRead(userId: number) {
    const result = await this.prisma.notifications.updateMany({
      where: {
        user_id: userId,
        is_read: false
      },
      data: {
        is_read: true,
        read_at: new Date()
      }
    });
    return { message: `Đã đánh dấu đọc ${result.count} thông báo` };
  }
}

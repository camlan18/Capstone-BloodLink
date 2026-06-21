import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto, UpdateScheduleDto, ScheduleFilterDto } from './dto/schedules.dto';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

@Injectable()
export class SchedulesService implements OnModuleInit {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    // Chạy dọn dẹp các lịch cũ ngay khi hệ thống khởi động
    await this.handleCronClosePastSchedules();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronClosePastSchedules() {
    this.logger.log('Running daily cron job to close past donation schedules...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const result = await this.prisma.facility_donation_schedules.updateMany({
        where: {
          status: 'OPEN',
          date: {
            lt: today
          }
        },
        data: {
          status: 'CLOSED'
        }
      });
      
      this.logger.log(`Closed ${result.count} past donation schedules.`);
    } catch (error) {
      this.logger.error('Error auto-closing schedules', error);
    }
  }

  async getAllSchedules(query: ScheduleFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.facility_id) where.facility_id = Number(query.facility_id);
    if (query.status) where.status = query.status;
    if (query.date) where.date = new Date(query.date);

    const [data, total] = await Promise.all([
      this.prisma.facility_donation_schedules.findMany({
        where,
        skip,
        take: limit,
        include: { facility: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.facility_donation_schedules.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getScheduleById(id: number) {
    const schedule = await this.prisma.facility_donation_schedules.findUnique({
      where: { schedule_id: id },
      include: { facility: true },
    });
    if (!schedule) throw new NotFoundException('Lịch hiến máu không tồn tại');
    return schedule;
  }

  async createSchedule(dto: CreateScheduleDto) {
    // Parse time strings (e.g. "08:00") into Date objects (using a dummy date since it's @db.Time)
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    const parseTime = (timeStr: string) => {
      const [h, m, s] = timeStr.split(':').map(Number);
      const dt = new Date(baseDate);
      dt.setHours(h, m, s || 0);
      return dt;
    };

    return await this.prisma.facility_donation_schedules.create({
      data: {
        facility_id: dto.facility_id,
        date: new Date(dto.date),
        start_time: parseTime(dto.start_time),
        end_time: parseTime(dto.end_time),
        max_donors: dto.max_donors || 50,
        status: dto.status || 'OPEN',
        terms_html: dto.terms_html,
      }
    });
  }

  async updateSchedule(id: number, dto: UpdateScheduleDto) {
    const schedule = await this.prisma.facility_donation_schedules.findUnique({ where: { schedule_id: id } });
    if (!schedule) throw new NotFoundException('Lịch hiến máu không tồn tại');

    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    const parseTime = (timeStr?: string) => {
      if (!timeStr) return undefined;
      const [h, m, s] = timeStr.split(':').map(Number);
      const dt = new Date(baseDate);
      dt.setHours(h, m, s || 0);
      return dt;
    };

    return await this.prisma.facility_donation_schedules.update({
      where: { schedule_id: id },
      data: {
        ...(dto.facility_id && { facility_id: dto.facility_id }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.start_time && { start_time: parseTime(dto.start_time) }),
        ...(dto.end_time && { end_time: parseTime(dto.end_time) }),
        ...(dto.max_donors !== undefined && { max_donors: dto.max_donors }),
        ...(dto.status && { status: dto.status }),
        ...(dto.terms_html !== undefined && { terms_html: dto.terms_html }),
      }
    });
  }

  async deleteSchedule(id: number) {
    const schedule = await this.prisma.facility_donation_schedules.findUnique({ 
      where: { schedule_id: id },
      include: { _count: { select: { donor_availability_slots: true } } }
    });
    if (!schedule) throw new NotFoundException('Lịch hiến máu không tồn tại');

    if (schedule._count.donor_availability_slots > 0) {
      throw new BadRequestException('Không thể xóa lịch này vì đã có người đăng ký hoặc slot');
    }

    await this.prisma.facility_donation_schedules.delete({ where: { schedule_id: id } });
    return { message: 'Xóa lịch hiến máu thành công' };
  }

  async getScheduleDonors(scheduleId: number, query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { schedule_id: scheduleId };
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.donor_availability_slots.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              phone: true,
              gender: true,
              blood_type: true
            }
          }
        },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.donor_availability_slots.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateDonorStatus(scheduleId: number, slotId: number, status: string) {
    const slot = await this.prisma.donor_availability_slots.findUnique({
      where: { slot_id: slotId }
    });
    
    if (!slot || slot.schedule_id !== scheduleId) {
      throw new NotFoundException('Không tìm thấy thông tin đăng ký');
    }

    const updatedSlot = await this.prisma.donor_availability_slots.update({
      where: { slot_id: slotId },
      data: { status }
    });

    await this.notificationsService.createNotification({
      user_ids: [updatedSlot.user_id],
      title: 'Cập nhật trạng thái lịch hẹn',
      message: `Trạng thái đăng ký hiến máu của bạn đã được chuyển thành: ${status}.`,
      notification_type: NotificationType.INFO,
      reference_type: 'SLOT',
      reference_id: slotId
    });

    return updatedSlot;
  }

  async exportScheduleDonors(scheduleId: number) {
    const schedule = await this.getScheduleById(scheduleId);
    
    const donors = await this.prisma.donor_availability_slots.findMany({
      where: { schedule_id: scheduleId },
      include: {
        user: {
          include: { blood_type: true }
        }
      },
      orderBy: { created_at: 'asc' },
    });

    const statusMap: any = {
      'PENDING': 'Đã đăng ký',
      'CONFIRMED': 'Đã xác nhận',
      'ARRIVED': 'Đã đến',
      'EXAMINED_PASSED': 'Khám đạt',
      'EXAMINED_FAILED': 'Không đạt',
      'COMPLETED': 'Đã hiến máu',
      'CANCELLED': 'Đã hủy'
    };

    const dataToExport = donors.map((slot, index) => ({
      'STT': index + 1,
      'Họ tên': slot.user?.full_name || '',
      'Số điện thoại': slot.user?.phone || '',
      'Email': slot.user?.email || '',
      'Nhóm máu': slot.user?.blood_type?.blood_type_code || 'Chưa rõ',
      'Trạng thái': statusMap[slot.status] || slot.status,
      'Ngày đăng ký': slot.created_at ? new Date(slot.created_at).toLocaleString('vi-VN') : '',
    }));

    const ExcelUtil = require('../common/utils/excel.util').ExcelUtil;
    const buffer = ExcelUtil.generateExcel(dataToExport, 'Danh Sách Đăng Ký');

    return {
      buffer,
      filename: `Danh_sach_DKHM_${schedule.facility?.facility_name?.replace(/\s+/g, '_') || 'Lich'}_${schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : ''}.xlsx`
    };
  }
}

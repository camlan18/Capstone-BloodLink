import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/pagination.dto';
import { BookDonationSlotDto } from './dto/donor.dto';
import { RecordDonationDto, UpdateSlotStatusDto, UpdateDonorProfileDto } from './dto/donor.dto';
import { ExcelUtil } from '../common/utils/excel.util';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

@Injectable()
export class DonorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) { }

  async registerDonorProfile(userId: number, data: any) {
    const existing = await this.prisma.donor_profiles.findUnique({
      where: { user_id: userId },
    });
    if (existing) throw new BadRequestException('Hồ sơ hiến máu đã tồn tại');

    return await this.prisma.$transaction(async (tx) => {
      const profile = await tx.donor_profiles.create({
        data: {
          user_id: userId,
          blood_type_id: data.blood_type_id,
          weight_kg: data.weight_kg,
          height_cm: data.height_cm,
          health_notes: data.health_notes,
          emergency_contact_name: data.emergency_contact_name,
          emergency_contact_phone: data.emergency_contact_phone,
        },
      });

      await tx.users.update({
        where: { user_id: userId },
        data: { is_donor_registered: true, blood_type_id: data.blood_type_id },
      });

      return profile;
    });
  }

  async getDonorProfile(userId: number) {
    const profile = await this.prisma.donor_profiles.findUnique({
      where: { user_id: userId },
      include: { blood_type: true },
    });
    if (!profile) throw new NotFoundException('Hồ sơ không tồn tại');
    return profile;
  }

  async updateDonorProfile(userId: number, dto: UpdateDonorProfileDto) {
    return await this.prisma.$transaction(async (tx) => {
      // Cập nhật users table
      const userUpdate: any = {};
      if (dto.full_name !== undefined) userUpdate.full_name = dto.full_name;
      if (dto.phone_number !== undefined) userUpdate.phone = dto.phone_number;
      if (dto.date_of_birth !== undefined) userUpdate.date_of_birth = dto.date_of_birth ? new Date(dto.date_of_birth) : null;
      if (dto.gender !== undefined) userUpdate.gender = dto.gender;
      if (dto.address !== undefined) userUpdate.address = dto.address;
      if (dto.identity_card !== undefined) userUpdate.identity_card = dto.identity_card;
      if (dto.blood_type_id !== undefined) userUpdate.blood_type_id = dto.blood_type_id;

      if (Object.keys(userUpdate).length > 0) {
        await tx.users.update({
          where: { user_id: userId },
          data: userUpdate,
        });
      }

      // Cập nhật hoặc tạo donor_profiles
      const profileUpdate: any = {};
      if (dto.blood_type_id !== undefined) profileUpdate.blood_type_id = dto.blood_type_id;
      if (dto.weight_kg !== undefined) profileUpdate.weight_kg = dto.weight_kg;
      if (dto.height_cm !== undefined) profileUpdate.height_cm = dto.height_cm;
      if (dto.health_notes !== undefined) profileUpdate.health_notes = dto.health_notes;
      if (dto.emergency_contact_name !== undefined) profileUpdate.emergency_contact_name = dto.emergency_contact_name;
      if (dto.emergency_contact_phone !== undefined) profileUpdate.emergency_contact_phone = dto.emergency_contact_phone;

      let profile = await tx.donor_profiles.findUnique({ where: { user_id: userId } });

      if (profile) {
        if (Object.keys(profileUpdate).length > 0) {
          profile = await tx.donor_profiles.update({
            where: { user_id: userId },
            data: profileUpdate,
          });
        }
      } else {
        if (!dto.blood_type_id) throw new BadRequestException('Vui lòng chọn nhóm máu khi tạo hồ sơ lần đầu');
        profileUpdate.user_id = userId;
        profileUpdate.blood_type_id = dto.blood_type_id;
        profile = await tx.donor_profiles.create({
          data: profileUpdate,
        });
        await tx.users.update({
          where: { user_id: userId },
          data: { is_donor_registered: true },
        });
      }
      return { message: 'Cập nhật hồ sơ thành công', profile };
    });
  }

  async updateAvailability(userId: number, isAvailable: boolean) {
    return await this.prisma.users.update({
      where: { user_id: userId },
      data: { is_available_for_donation: isAvailable },
    });
  }

  async bookDonationSlot(userId: number, data: BookDonationSlotDto) {
    const schedule = await this.prisma.facility_donation_schedules.findUnique({
      where: { schedule_id: data.schedule_id },
    });

    if (!schedule) {
      throw new NotFoundException('Lịch hiến máu không tồn tại');
    }

    if (schedule.current_donors >= schedule.max_donors) {
      throw new BadRequestException('Lịch này đã đủ số lượng đăng ký');
    }

    if (schedule.status !== 'OPEN') {
      throw new BadRequestException('Lịch này không còn nhận đăng ký');
    }

    const existing = await this.prisma.donor_availability_slots.findFirst({
      where: { user_id: userId, schedule_id: data.schedule_id, is_active: true },
    });

    if (existing) {
      throw new BadRequestException('Bạn đã đăng ký lịch này rồi');
    }

    const slot = await this.prisma.donor_availability_slots.create({
      data: {
        user_id: userId,
        schedule_id: data.schedule_id,
        notes: data.notes,
        status: 'CONFIRMED',
      },
    });

    await this.prisma.facility_donation_schedules.update({
      where: { schedule_id: data.schedule_id },
      data: { current_donors: { increment: 1 } },
    });

    const user = await this.prisma.users.findUnique({ where: { user_id: userId } });

    await this.notificationsService.createNotification({
      user_ids: [userId],
      title: 'Đăng ký lịch thành công',
      message: `Bạn đã đăng ký thành công lịch hiến máu vào ngày ${new Date(schedule.date).toLocaleDateString('vi-VN')}.`,
      notification_type: NotificationType.INFO,
      reference_type: 'SCHEDULE',
      reference_id: schedule.schedule_id
    });

    await this.notificationsService.notifyAdmins(
      'Có người đăng ký lịch hiến máu',
      `${user?.full_name || 'Một người dùng'} vừa đăng ký lịch hiến máu ngày ${new Date(schedule.date).toLocaleDateString('vi-VN')}.`,
      NotificationType.INFO,
      'SCHEDULE',
      schedule.schedule_id
    );

    return slot;
  }

  async cancelDonationSlot(userId: number, slotId: number) {
    const slot = await this.prisma.donor_availability_slots.findFirst({
      where: { slot_id: slotId, user_id: userId, is_active: true },
      include: { schedule: true },
    });

    if (!slot || !slot.schedule) {
      throw new NotFoundException('Không tìm thấy thông tin đăng ký lịch này');
    }

    const today = new Date();
    const scheduleDate = new Date(slot.schedule.date);
    const diffTime = scheduleDate.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    if (diffDays <= 2) {
      throw new BadRequestException('Chỉ được phép hủy lịch trước ngày hiến máu ít nhất 2 ngày.');
    }

    // Tiến hành hủy
    await this.prisma.donor_availability_slots.update({
      where: { slot_id: slotId },
      data: { status: 'CANCELLED', is_active: false },
    });

    // Trừ đi số lượng
    await this.prisma.facility_donation_schedules.update({
      where: { schedule_id: slot.schedule_id! },
      data: { current_donors: { decrement: 1 } },
    });

    await this.notificationsService.createNotification({
      user_ids: [userId],
      title: 'Hủy lịch hiến máu',
      message: `Bạn đã hủy lịch hiến máu ngày ${scheduleDate.toLocaleDateString('vi-VN')}.`,
      notification_type: NotificationType.WARNING,
      reference_type: 'SCHEDULE',
      reference_id: slot.schedule_id!
    });

    return { message: 'Đã hủy lịch thành công' };
  }

  async getDonationHistory(userId: number) {
    const slots = await this.prisma.donor_availability_slots.findMany({
      where: { user_id: userId },
      include: {
        schedule: {
          include: { facility: true }
        }
      },
      orderBy: { specific_date: 'desc' },
    });

    const donations = await this.prisma.donations.findMany({
      where: { donor_user_id: userId },
      include: { facility: true, component: true, blood_type: true }
    });

    // Map slots to a unified history
    const history = slots.map(slot => {
      const slotDate = slot.specific_date || slot.schedule?.date;
      
      // Find matching donation if status is COMPLETED
      const donation = donations.find(d => 
        slotDate && new Date(d.donation_date).toISOString().split('T')[0] === 
        new Date(slotDate).toISOString().split('T')[0]
      );

      return {
        donation_id: donation?.donation_id || slot.slot_id,
        donor_id: userId,
        facility_id: slot.schedule?.facility_id || donation?.facility_id,
        donation_date: donation?.donation_date || slotDate,
        volume_ml: donation?.volume_ml || 0,
        status: slot.status, // PENDING, EXAMINED_FAILED, COMPLETED, CANCELLED
        facility: slot.schedule?.facility || donation?.facility,
        notes: slot.notes || donation?.result_notes
      };
    });
    
    // Also add any donations that don't have a matching slot (e.g. walk-ins)
    const walkInDonations = donations.filter(d => !slots.some(s => {
      const sDate = s.specific_date || s.schedule?.date;
      return sDate && new Date(d.donation_date).toISOString().split('T')[0] === 
             new Date(sDate).toISOString().split('T')[0];
    })).map(d => ({
        donation_id: d.donation_id,
        donor_id: userId,
        facility_id: d.facility_id,
        donation_date: d.donation_date,
        volume_ml: d.volume_ml,
        status: d.status_code,
        facility: d.facility,
        notes: d.result_notes
    }));

    return [...history, ...walkInDonations].sort((a, b) => new Date(b.donation_date || 0).getTime() - new Date(a.donation_date || 0).getTime());
  }

  async getMySlots(userId: number) {
    return await this.prisma.donor_availability_slots.findMany({
      where: { user_id: userId, is_active: true },
      include: {
        schedule: {
          include: { facility: true }
        }
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getSchedules(facilityId?: number) {
    const where: any = { status: 'OPEN', date: { gte: new Date() } };
    if (facilityId) where.facility_id = facilityId;

    return await this.prisma.facility_donation_schedules.findMany({
      where,
      include: { facility: true },
      orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
    });
  }

  // --- FACILITY ADMIN ROUTES ---

  async getSlots(query: PaginationDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.search) {
      where.user = {
        full_name: { contains: query.search }
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.donor_availability_slots.findMany({
        where,
        skip,
        take: limit,
        include: { 
          user: { select: { full_name: true, email: true, phone: true, date_of_birth: true, gender: true, address: true, identity_card: true, blood_type_id: true, donor_profile: { select: { blood_type_id: true } } } },
          schedule: { include: { facility: true } }
        },
        orderBy: { specific_date: 'desc' },
      }),
      this.prisma.donor_availability_slots.count(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createAdminSlot(dto: any) {
    return await this.prisma.donor_availability_slots.create({
      data: {
        user_id: Number(dto.user_id),
        specific_date: dto.specific_date ? new Date(dto.specific_date) : null,
        notes: dto.notes,
        status: 'PENDING'
      }
    });
  }

  async updateSlotStatus(slotId: number, dto: UpdateSlotStatusDto) {
    const slot = await this.prisma.donor_availability_slots.findUnique({ where: { slot_id: slotId } });
    if (!slot) throw new NotFoundException('Slot không tồn tại');

    const updatedSlot = await this.prisma.donor_availability_slots.update({
      where: { slot_id: slotId },
      data: { 
        status: dto.status,
        ...(dto.notes !== undefined && { notes: dto.notes })
      },
    });

    await this.notificationsService.createNotification({
      user_ids: [updatedSlot.user_id],
      title: 'Cập nhật trạng thái lịch hẹn',
      message: `Trạng thái đăng ký hiến máu của bạn đã được chuyển thành: ${dto.status}.`,
      notification_type: NotificationType.INFO,
      reference_type: 'SLOT',
      reference_id: slotId
    });

    return updatedSlot;
  }

  async recordDonation(facilityUserId: number, dto: RecordDonationDto) {
    return await this.prisma.$transaction(async (tx) => {
      const donationCode = `DON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const donation = await tx.donations.create({
        data: {
          donation_code: donationCode,
          donor_user_id: dto.donor_user_id,
          facility_id: dto.facility_id,
          blood_type_id: dto.blood_type_id,
          component_id: dto.component_id,
          volume_ml: dto.volume_ml,
          donation_date: new Date(dto.donation_date),
          status_code: 'COMPLETED',
          staff_user_id: facilityUserId,
          health_check_passed: dto.health_check_passed !== undefined ? dto.health_check_passed : true,
          result_notes: dto.result_notes,
        }
      });

      if (dto.health_check_passed !== false) {
        // Mặc định hạn sử dụng máu là 35 ngày
        const shelfLifeDays = 35;
        const expiryDate = new Date(dto.donation_date);
        expiryDate.setDate(expiryDate.getDate() + shelfLifeDays);

        const inventory = await tx.blood_inventory.create({
          data: {
            bag_code: `BAG-${donationCode}`,
            facility_id: dto.facility_id,
            blood_type_id: dto.blood_type_id,
            component_id: dto.component_id,
            volume_ml: dto.volume_ml,
            collection_date: new Date(dto.donation_date),
            expiry_date: expiryDate,
            status_code: 'AVAILABLE',
            source_donation_id: donation.donation_id
          }
        });

        await tx.inventory_transactions.create({
          data: {
            inventory_id: inventory.inventory_id,
            transaction_type: 'IN',
            reference_type: 'DONATION',
            reference_id: donation.donation_id,
            performed_by: facilityUserId,
            notes: 'Nhập kho từ lượt hiến máu'
          }
        });
      }

      const intervalRule = await tx.donation_interval_rules.findUnique({
        where: { component_id: dto.component_id }
      });
      const minIntervalDays = intervalRule ? intervalRule.min_interval_days : 84;

      const nextDate = new Date(dto.donation_date);
      nextDate.setDate(nextDate.getDate() + minIntervalDays);

      await tx.donor_profiles.updateMany({
        where: { user_id: dto.donor_user_id },
        data: {
          total_donations: { increment: 1 },
          last_donation_date: new Date(dto.donation_date),
          next_eligible_date: nextDate,
        }
      });

      return donation;
    });
  }

  // --- EXCEL FEATURE ---

  async exportExcel(query: any): Promise<Buffer> {
    const list = await this.getSlots({ ...query, limit: 10000 });
    const data = list.data.map((item: any) => ({
      'Họ tên': item.user?.full_name || '',
      'Ngày (YYYY-MM-DD)': item.specific_date ? new Date(item.specific_date).toLocaleDateString('vi-VN') : '',
      'Ghi chú': item.notes || '',
      'Trạng thái': item.status
    }));
    return ExcelUtil.generateExcel(data, 'LichHen');
  }

  async getTemplate(): Promise<Buffer> {
    const headers = [
      'User (ID)',
      'Ngày (YYYY-MM-DD)',
      'Ghi chú'
    ];
    return ExcelUtil.generateTemplate(headers, 'Template_LichHen');
  }

  async importExcel(buffer: Buffer, staffId: number) {
    const data = ExcelUtil.parseExcel(buffer);
    let success = 0;
    let failed = 0;

    for (const row of data) {
      try {
        const userId = Number(row['User (ID)']);
        const dateStr = row['Ngày (YYYY-MM-DD)'];
        const notes = row['Ghi chú'];

        if (!userId || !dateStr) {
          failed++;
          continue;
        }

        const date = new Date(dateStr);

        await this.prisma.donor_availability_slots.create({
          data: {
            user_id: userId,
            specific_date: date,
            notes: notes,
            status: 'PENDING'
          }
        });
        success++;
      } catch (err) {
        failed++;
      }
    }

    return { message: `Import hoàn tất. Thành công: ${success}, Thất bại/Bỏ qua: ${failed}` };
  }
}

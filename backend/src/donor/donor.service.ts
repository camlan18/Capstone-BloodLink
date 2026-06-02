import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/pagination.dto';
import { BookDonationSlotDto } from './dto/donor.dto';
import { RecordDonationDto, UpdateSlotStatusDto, UpdateDonorProfileDto } from './dto/donor.dto';

@Injectable()
export class DonorService {
  constructor(private readonly prisma: PrismaService) {}

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

      let profile = await tx.donor_profiles.findUnique({ where: { user_id: userId }});
      
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

    // Kiểm tra xem đã đăng ký chưa
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

    // Tăng số lượng đã đăng ký
    await this.prisma.facility_donation_schedules.update({
      where: { schedule_id: data.schedule_id },
      data: { current_donors: { increment: 1 } },
    });

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

    return { message: 'Đã hủy lịch thành công' };
  }

  async getDonationHistory(userId: number) {
    return await this.prisma.donations.findMany({
      where: { donor_user_id: userId },
      include: { facility: true, component: true, blood_type: true },
      orderBy: { donation_date: 'desc' },
    });
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

    const [data, total] = await Promise.all([
      this.prisma.donor_availability_slots.findMany({
        skip,
        take: limit,
        include: { user: { select: { full_name: true, email: true } } },
        orderBy: { specific_date: 'desc' },
      }),
      this.prisma.donor_availability_slots.count(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateSlotStatus(slotId: number, dto: UpdateSlotStatusDto) {
    const slot = await this.prisma.donor_availability_slots.findUnique({ where: { slot_id: slotId } });
    if (!slot) throw new NotFoundException('Slot không tồn tại');

    // Cập nhật notes để ghi nhận status tạm thời (do schema chưa có status field cho slot)
    return await this.prisma.donor_availability_slots.update({
      where: { slot_id: slotId },
      data: { notes: dto.status },
    });
  }

  async recordDonation(facilityUserId: number, dto: RecordDonationDto) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Tạo donation_code
      const donationCode = `DON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // 2. Tạo record donation
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
        }
      });

      // 3. Cập nhật ngày hiến máu tiếp theo cho donor (giả sử sau 3 tháng)
      const nextDate = new Date(dto.donation_date);
      nextDate.setMonth(nextDate.getMonth() + 3);
      
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
}

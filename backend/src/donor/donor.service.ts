import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaginationDto } from '../common/pagination.dto';
import { BookDonationSlotDto } from './dto/donor.dto';
import { RecordDonationDto, UpdateSlotStatusDto, UpdateDonorProfileDto } from './dto/donor.dto';
import { ExcelUtil } from '../common/utils/excel.util';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

@Injectable()
export class DonorService {
  private readonly logger = new Logger(DonorService.name);

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
    if (!data.schedule_id && (!data.request_id || !data.specific_date || !data.facility_id)) {
      throw new BadRequestException('Vui lòng chọn lịch hiến máu hoặc cung cấp thông tin yêu cầu và ngày.');
    }

    let finalScheduleId = data.schedule_id;
    let bloodRequest: any = null;

    // 1. Nếu đang đăng ký cho một yêu cầu cụ thể
    if (data.request_id) {
      bloodRequest = await this.prisma.blood_requests.findUnique({
        where: { request_id: data.request_id },
        include: { component: true, blood_type: true }
      });

      if (!bloodRequest) throw new NotFoundException('Không tìm thấy yêu cầu máu này');

      // 1.1. Kiểm tra tính tương thích nhóm máu
      const donorProfile = await this.prisma.donor_profiles.findUnique({
        where: { user_id: userId }
      });
      if (!donorProfile || !donorProfile.blood_type_id) {
        throw new BadRequestException('Vui lòng cập nhật nhóm máu trong hồ sơ trước khi hiến máu cho yêu cầu.');
      }

      const compatibility = await this.prisma.blood_compatibility.findFirst({
        where: {
          component_id: bloodRequest.component_id,
          recipient_blood_type_id: bloodRequest.blood_type_id,
          donor_blood_type_id: donorProfile.blood_type_id
        }
      });

      if (!compatibility || !compatibility.is_compatible) {
        throw new BadRequestException('Nhóm máu của bạn không phù hợp để hiến cho yêu cầu này.');
      }

      // 1.1.5 Kiểm tra số lượng người đã đăng ký hiến cho yêu cầu này
      const matchCount = await this.prisma.blood_request_donor_matches.count({
        where: {
          request_id: data.request_id,
          match_status: 'ACCEPTED'
        }
      });

      if (matchCount >= 3) {
        throw new BadRequestException('Yêu cầu này đã đủ số lượng người hiến. Xin cảm ơn lòng hảo tâm của bạn.');
      }

      // 1.2. Xử lý tạo lịch ngầm định (Lịch khẩn cấp luôn tạo mới 1 slot riêng biệt cho người này)
      if (!finalScheduleId && data.facility_id && data.specific_date) {
        const specificDate = new Date(data.specific_date);
        const startTime = new Date(specificDate);
        const endTime = new Date(specificDate);
        
        if (data.expected_time) {
          const [hh, mm] = data.expected_time.split(':');
          startTime.setHours(Number(hh), Number(mm) || 0, 0, 0);
          endTime.setHours(Number(hh) + 1, Number(mm) || 0, 0, 0);
        } else {
          startTime.setHours(7, 0, 0, 0);
          endTime.setHours(17, 0, 0, 0);
        }

        const newSchedule = await this.prisma.facility_donation_schedules.create({
          data: {
            facility_id: data.facility_id,
            date: specificDate,
            start_time: startTime,
            end_time: endTime,
            max_donors: 1, // Lịch riêng chỉ 1 chỗ cho lượt đăng ký này
            current_donors: 0,
            status: 'OPEN'
          }
        });
        finalScheduleId = newSchedule.schedule_id;
      }
    }

    if (!finalScheduleId) {
      throw new BadRequestException('Không thể xác định lịch hiến máu.');
    }

    const schedule = await this.prisma.facility_donation_schedules.findUnique({
      where: { schedule_id: finalScheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Lịch hiến máu không tồn tại');
    }

    // Kiểm tra quy tắc khoảng cách hiến máu (next_eligible_date)
    const donorProfile = await this.prisma.donor_profiles.findUnique({
      where: { user_id: userId }
    });
    
    if (donorProfile && donorProfile.next_eligible_date) {
      const scheduleDate = new Date(schedule.date);
      scheduleDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(donorProfile.next_eligible_date);
      nextDate.setHours(0, 0, 0, 0);
      
      if (scheduleDate < nextDate) {
        throw new BadRequestException(`Bạn chưa đủ điều kiện thời gian để hiến máu tiếp. Ngày có thể hiến tiếp theo là ${nextDate.toLocaleDateString('vi-VN')}`);
      }
    }

    if (schedule.current_donors >= schedule.max_donors) {
      throw new BadRequestException('Lịch này đã đủ số lượng đăng ký');
    }

    if (schedule.status !== 'OPEN') {
      throw new BadRequestException('Lịch này không còn nhận đăng ký');
    }

    const existing = await this.prisma.donor_availability_slots.findFirst({
      where: { user_id: userId, schedule_id: finalScheduleId, is_active: true },
    });

    if (existing) {
      throw new BadRequestException('Bạn đã đăng ký lịch này rồi');
    }

    // Đánh dấu notes nếu có request_id
    let slotNotes = data.notes || '';
    if (bloodRequest) {
      const rqNote = `Đăng ký hiến máu cho yêu cầu: ${bloodRequest.patient_name} (Mã: ${bloodRequest.request_code})`;
      slotNotes = slotNotes ? `${slotNotes} | ${rqNote}` : rqNote;
    }

    const slot = await this.prisma.donor_availability_slots.create({
      data: {
        user_id: userId,
        schedule_id: finalScheduleId,
        notes: slotNotes,
        status: 'CONFIRMED',
      },
    });

    await this.prisma.facility_donation_schedules.update({
      where: { schedule_id: finalScheduleId },
      data: { current_donors: { increment: 1 } },
    });

    // 2. Nếu là đăng ký cho yêu cầu, tạo record match
    if (bloodRequest) {
      await this.prisma.blood_request_donor_matches.create({
        data: {
          request_id: bloodRequest.request_id,
          donor_user_id: userId,
          match_status: 'ACCEPTED'
        }
      });
    }

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

  async getSlots(query: PaginationDto, user: any) {
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
    
    if (user.role_code === 'HOSPITAL_STAFF') {
      where.schedule = {
        facility_id: user.facility_id || -1
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
      this.prisma.donor_availability_slots.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createAdminSlot(dto: any, user: any) {
    // Nếu là STAFF, kiểm tra xem lịch có thuộc cơ sở của họ không
    if (user.role_code === 'HOSPITAL_STAFF') {
      const schedule = await this.prisma.facility_donation_schedules.findUnique({
        where: { schedule_id: Number(dto.schedule_id) }
      });
      if (schedule?.facility_id !== user.facility_id) {
        throw new BadRequestException('Bạn không có quyền đăng ký cho lịch của cơ sở khác');
      }
    }

    return await this.prisma.donor_availability_slots.create({
      data: {
        user_id: Number(dto.user_id),
        schedule_id: dto.schedule_id ? Number(dto.schedule_id) : undefined,
        specific_date: dto.specific_date ? new Date(dto.specific_date) : null,
        notes: dto.notes,
        status: 'PENDING'
      }
    });
  }

  async updateSlotStatus(slotId: number, dto: UpdateSlotStatusDto, user: any) {
    const slot = await this.prisma.donor_availability_slots.findUnique({ 
      where: { slot_id: slotId },
      include: { schedule: true }
    });
    if (!slot) throw new NotFoundException('Slot không tồn tại');

    if (user.role_code === 'HOSPITAL_STAFF' && slot.schedule?.facility_id !== user.facility_id) {
      throw new BadRequestException('Bạn không có quyền cập nhật slot của cơ sở khác');
    }

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

  async recordDonation(user: any, dto: RecordDonationDto) {
    const facilityId = user.role_code === 'HOSPITAL_STAFF' ? user.facility_id : dto.facility_id;
    if (!facilityId) throw new BadRequestException('Cơ sở y tế không hợp lệ');

    return await this.prisma.$transaction(async (tx) => {
      const donationCode = `DON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      let requestId: number | null = null;
      let matchedRequest: any = null;
      if (dto.request_code) {
         matchedRequest = await tx.blood_requests.findUnique({
            where: { request_code: dto.request_code }
         });
         if (matchedRequest) {
            requestId = matchedRequest.request_id;
         }
      }

      const donation = await tx.donations.create({
        data: {
          donation_code: donationCode,
          donor_user_id: dto.donor_user_id,
          facility_id: facilityId,
          blood_type_id: dto.blood_type_id,
          component_id: dto.component_id,
          volume_ml: dto.volume_ml,
          donation_date: new Date(dto.donation_date),
          status_code: 'COMPLETED',
          staff_user_id: user.user_id,
          health_check_passed: dto.health_check_passed !== undefined ? dto.health_check_passed : true,
          result_notes: dto.result_notes,
          request_id: requestId,
        }
      });

      if (requestId && dto.health_check_passed !== false && matchedRequest) {
          const newFulfilled = matchedRequest.units_fulfilled + 1;
          let newStatusId = matchedRequest.status_id;
          if (newFulfilled >= matchedRequest.units_needed) {
             const completedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'COMPLETED' } });
             if (completedStatus) newStatusId = completedStatus.status_id;
          }
          await tx.blood_requests.update({
             where: { request_id: requestId },
             data: { units_fulfilled: newFulfilled, status_id: newStatusId }
          });
      }

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
            status_code: requestId ? 'RESERVED' : 'AVAILABLE',
            source_donation_id: donation.donation_id
          }
        });

        await tx.inventory_transactions.create({
          data: {
            inventory_id: inventory.inventory_id,
            transaction_type: 'IN',
            reference_type: 'DONATION',
            reference_id: donation.donation_id,
            performed_by: user.user_id,
            notes: 'Nhập kho từ lượt hiến máu'
          }
        });

        if (requestId) {
          await tx.blood_request_inventory_allocations.create({
            data: { 
              request_id: requestId, 
              inventory_id: inventory.inventory_id, 
              allocated_by: user.user_id 
            }
          });

          await tx.inventory_transactions.create({
            data: {
              inventory_id: inventory.inventory_id,
              transaction_type: 'RESERVE',
              reference_type: 'REQUEST',
              reference_id: requestId,
              performed_by: user.user_id,
              notes: 'Tự động cấp phát cho yêu cầu máu khẩn cấp'
            }
          });
        }

        // Cập nhật hồ sơ hiến máu (Chỉ áp dụng khi hiến thành công)
        const intervalRule = await tx.donation_interval_rules.findUnique({
          where: { component_id: dto.component_id }
        });
        const minIntervalDays = intervalRule ? intervalRule.min_interval_days : 84;

        const nextDate = new Date(dto.donation_date);
        nextDate.setDate(nextDate.getDate() + minIntervalDays);

        const existingProfile = await tx.donor_profiles.findUnique({
          where: { user_id: dto.donor_user_id }
        });

        if (existingProfile) {
          await tx.donor_profiles.update({
            where: { user_id: dto.donor_user_id },
            data: {
              total_donations: { increment: 1 },
              first_donation_date: existingProfile.first_donation_date ? existingProfile.first_donation_date : new Date(dto.donation_date),
              last_donation_date: new Date(dto.donation_date),
              next_eligible_date: nextDate,
            }
          });
        }

        // Tạo sẵn nhắc nhở
        const upcomingDate = new Date(nextDate);
        upcomingDate.setDate(upcomingDate.getDate() - 3);

        await tx.donation_reminders.createMany({
          data: [
            {
              user_id: dto.donor_user_id,
              donation_id: donation.donation_id,
              component_id: dto.component_id,
              reminder_type: 'UPCOMING_ELIGIBLE',
              reminder_date: upcomingDate,
              message: `Sắp tới hạn có thể hiến máu! Ngày hiến máu tiếp theo của bạn là ${nextDate.toLocaleDateString('vi-VN')}. Hãy chuẩn bị sức khỏe thật tốt nhé!`,
            },
            {
              user_id: dto.donor_user_id,
              donation_id: donation.donation_id,
              component_id: dto.component_id,
              reminder_type: 'NOW_ELIGIBLE',
              reminder_date: nextDate,
              message: `Bạn đã đủ điều kiện thời gian để tiếp tục hiến máu! Hãy đặt lịch hiến máu ngay hôm nay để cứu giúp người bệnh.`,
            }
          ]
        });
      }

      return donation;
    });
  }

  // --- CRON JOBS ---
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleCronDonationReminders() {
    this.logger.log('Bắt đầu kiểm tra và gửi nhắc nhở hiến máu...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const reminders = await this.prisma.donation_reminders.findMany({
        where: {
          is_sent: false,
          reminder_date: { lte: today },
        }
      });

      if (reminders.length > 0) {
        for (const reminder of reminders) {
          await this.notificationsService.createNotification({
            user_ids: [reminder.user_id],
            title: reminder.reminder_type === 'UPCOMING_ELIGIBLE' ? 'Sắp tới hạn hiến máu' : 'Đã đến hạn hiến máu',
            message: reminder.message,
            notification_type: NotificationType.INFO,
            reference_type: 'DONATION',
            reference_id: reminder.donation_id || undefined
          });

          await this.prisma.donation_reminders.update({
            where: { reminder_id: reminder.reminder_id },
            data: { 
              is_sent: true,
              sent_at: new Date()
            }
          });
        }
        this.logger.log(`Đã gửi ${reminders.length} nhắc nhở hiến máu.`);
      }
    } catch (error) {
      this.logger.error('Lỗi khi chạy cron gửi nhắc nhở hiến máu', error);
    }
  }

  // --- EXCEL FEATURE ---

  async exportExcel(query: any, user: any): Promise<Buffer> {
    const list = await this.getSlots({ ...query, limit: 10000 }, user);
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

  async importExcel(buffer: Buffer, user: any) {
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

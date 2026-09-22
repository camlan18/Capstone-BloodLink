import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaginationDto } from '../common/pagination.dto';
import { BookDonationSlotDto } from './dto/donor.dto';
import { RecordDonationDto, UpdateSlotStatusDto, UpdateDonorProfileDto } from './dto/donor.dto';
import { ExcelUtil } from '../common/utils/excel.util';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { SystemSettingKey } from '../common/enums';

@Injectable()
export class DonorService {
  private readonly logger = new Logger(DonorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly systemSettingsService: SystemSettingsService,
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

  async calculateDonorEligibility(userId: number) {
    const profile = await this.prisma.donor_profiles.findUnique({
      where: { user_id: userId },
    });

    const latestDonation = await this.prisma.donations.findFirst({
      where: { donor_user_id: userId, status_code: 'COMPLETED' },
      orderBy: { donation_date: 'desc' },
    });

    let nextEligibleDate: Date | null = null;

    if (latestDonation) {
      if (latestDonation.next_eligible_date) {
        nextEligibleDate = new Date(latestDonation.next_eligible_date);
      } else {
        const d = new Date(latestDonation.donation_date);
        d.setDate(d.getDate() + 84);
        nextEligibleDate = d;
      }
    } else if (profile?.next_eligible_date) {
      nextEligibleDate = new Date(profile.next_eligible_date);
    }

    let daysUntilNextDonation = 0;
    let isEligible = true;

    if (nextEligibleDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eligibleDate = new Date(nextEligibleDate);
      eligibleDate.setHours(0, 0, 0, 0);

      const diffTime = eligibleDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        daysUntilNextDonation = diffDays;
        isEligible = false;
      }
    }

    // Tự động đồng bộ lại donor_profiles.next_eligible_date nếu chưa khớp
    if (profile) {
      const dbDateStr = profile.next_eligible_date ? new Date(profile.next_eligible_date).toISOString().slice(0, 10) : null;
      const calcDateStr = nextEligibleDate ? new Date(nextEligibleDate).toISOString().slice(0, 10) : null;
      if (dbDateStr !== calcDateStr) {
        await this.prisma.donor_profiles.update({
          where: { user_id: userId },
          data: { next_eligible_date: nextEligibleDate }
        }).catch(() => { });
      }
    }

    return {
      nextEligibleDate,
      daysUntilNextDonation,
      isEligible,
    };
  }

  async getDonorProfile(userId: number) {
    const profile = await this.prisma.donor_profiles.findUnique({
      where: { user_id: userId },
      include: { blood_type: true },
    });
    if (!profile) throw new NotFoundException('Hồ sơ không tồn tại');

    const eligibility = await this.calculateDonorEligibility(userId);

    return {
      ...profile,
      next_eligible_date: eligibility.nextEligibleDate,
      days_until_next_donation: eligibility.daysUntilNextDonation,
      is_eligible: eligibility.isEligible
    };
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
    if (data.is_health_cleared === false) {
      throw new BadRequestException('Xin lỗi bạn, với dữ liệu sàng lọc hiện tại thì bạn không thể hiến máu được rồi. Hãy khám bệnh kỹ và chăm sóc sức khỏe nhé!');
    }

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
    const eligibility = await this.calculateDonorEligibility(userId);

    if (eligibility.nextEligibleDate) {
      const scheduleDate = new Date(schedule.date);
      scheduleDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(eligibility.nextEligibleDate);
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

  async getMyMatches(userId: number) {
    return await this.prisma.blood_request_donor_matches.findMany({
      where: {
        donor_user_id: userId
      },
      include: {
        request: {
          include: {
            facility: true,
            blood_type: true,
            status: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getDonorAchievements(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      include: {
        blood_type: true,
        donations_donor: {
          where: { status_code: 'COMPLETED' }
        }
      }
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const profile = await this.prisma.donor_profiles.findUnique({ where: { user_id: userId } });
    const totalDonations = user.donations_donor.length;
    const totalVolume = user.donations_donor.reduce((sum, d) => sum + (d.volume_ml || 0), 0);

    // Tính số người đã giúp (dựa trên tất cả các ca được hệ thống kêu gọi/match)
    const matchesCompleted = await this.prisma.blood_request_donor_matches.count({
      where: { donor_user_id: userId }
    });

    const badges = [];
    if (totalDonations >= 1) badges.push({ id: 'first_blood', name: 'Giọt Máu Đầu Tiên', icon: 'droplet', color: 'bg-red-100 text-red-600' });
    if (totalDonations >= 3) badges.push({ id: 'bronze', name: 'Trái Tim Đồng', icon: 'heart', color: 'bg-amber-100 text-amber-600' });
    if (totalDonations >= 5) badges.push({ id: 'silver', name: 'Trái Tim Bạc', icon: 'award', color: 'bg-slate-200 text-slate-700' });
    if (totalDonations >= 10) badges.push({ id: 'gold', name: 'Trái Tim Vàng', icon: 'star', color: 'bg-yellow-100 text-yellow-600' });

    // Rare blood type badge
    if (user.blood_type && (user.blood_type.blood_type_code.includes('-') || user.blood_type.blood_type_code === 'AB+')) {
      badges.push({ id: 'rare', name: 'Máu Hiếm', icon: 'shield', color: 'bg-purple-100 text-purple-600' });
    }

    return {
      totalDonations,
      totalVolumeMl: totalVolume,
      peopleHelped: matchesCompleted,
      nextEligibleDate: profile?.next_eligible_date,
      badges,
      bloodType: user.blood_type?.blood_type_code
    };
  }

  async getCertificateData(userId: number, donationId: number) {
    const donation = await this.prisma.donations.findUnique({
      where: { donation_id: donationId },
      include: {
        donor: { include: { blood_type: true } },
        facility: true,
        certificate: { include: { approver: { select: { full_name: true } } } }
      }
    });

    if (!donation) throw new NotFoundException('Không tìm thấy thông tin hiến máu');
    if (donation.donor_user_id !== userId) throw new BadRequestException('Bạn không có quyền xem chứng nhận này');
    if (donation.status_code !== 'COMPLETED') throw new BadRequestException('Chỉ cấp chứng nhận cho lần hiến máu đã hoàn thành');

    const cert = donation.certificate;

    return {
      certificate_no: cert?.certificate_code || `BL-${donation.donation_date.getFullYear()}-${String(donation.donation_id).padStart(5, '0')}`,
      donation_id: donation.donation_id,
      donor_name: donation.donor.full_name,
      donor_dob: donation.donor.date_of_birth,
      donor_address: donation.donor.address,
      donor_identity_card: donation.donor.identity_card,
      blood_type: donation.donor.blood_type?.blood_type_code || donation.blood_type_id,
      donation_date: donation.donation_date,
      volume_ml: donation.volume_ml,
      facility_id: donation.facility_id,
      facility_name: donation.facility?.facility_name,
      facility_address: donation.facility?.address,
      facility_seal_url: donation.facility?.seal_image_url,
      facility_signature_url: donation.facility?.signature_image_url,
      director_name: donation.facility?.director_name,
      director_title: donation.facility?.director_title,
      issue_date: cert?.issued_at || cert?.approved_at || new Date(),
      cert_status: cert?.status || 'PENDING',
      approved_by_name: cert?.approver?.full_name || null,
      approved_at: cert?.approved_at || null,
      seal_number: cert?.seal_number || null,
      reject_reason: cert?.reject_reason || null,
    };
  }

  async getPublicCertificate(donationId: number) {
    const donation = await this.prisma.donations.findUnique({
      where: { donation_id: donationId },
      include: {
        donor: { include: { blood_type: true } },
        facility: true,
        certificate: { include: { approver: { select: { full_name: true } } } }
      }
    });

    if (!donation) throw new NotFoundException('Không tìm thấy thông tin hiến máu');
    if (donation.status_code !== 'COMPLETED') throw new BadRequestException('Chỉ cấp chứng nhận cho lần hiến máu đã hoàn thành');

    const cert = donation.certificate;
    if (!cert || cert.status !== 'APPROVED') {
      throw new BadRequestException('Chứng nhận chưa được duyệt hoặc không tồn tại');
    }

    return {
      certificate_no: cert.certificate_code,
      donation_id: donation.donation_id,
      donor_name: donation.donor.full_name,
      donor_dob: donation.donor.date_of_birth,
      donor_address: donation.donor.address,
      donor_identity_card: donation.donor.identity_card,
      blood_type: donation.donor.blood_type?.blood_type_code,
      donation_date: donation.donation_date,
      volume_ml: donation.volume_ml,
      facility_id: donation.facility_id,
      facility_name: donation.facility?.facility_name,
      facility_address: donation.facility?.address,
      facility_seal_url: donation.facility?.seal_image_url,
      facility_signature_url: donation.facility?.signature_image_url,
      director_name: donation.facility?.director_name,
      director_title: donation.facility?.director_title,
      issue_date: cert.issued_at || cert.approved_at,
      cert_status: cert.status,
      approved_by_name: cert.approver?.full_name || null,
      approved_at: cert.approved_at,
      seal_number: cert.seal_number,
    };
  }

  async getMyCertificates(userId: number, query: PaginationDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      donation: {
        donor_user_id: userId
      }
    };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.donation_certificates.findMany({
        where,
        skip,
        take: limit,
        include: {
          donation: {
            include: {
              facility: true,
              blood_type: true,
              component: true,
            }
          },
          approver: { select: { full_name: true } }
        },
        orderBy: { created_at: 'desc' }
      }),
      this.prisma.donation_certificates.count({ where })
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  // --- Certificate Management (Admin/Staff) ---

  async listCertificates(query: PaginationDto, user?: any) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (user?.role_code === 'HOSPITAL_STAFF') {
      where.donation = {
        facility_id: user.facility_id || -1
      };
    }

    if (query.search) {
      const searchConditions = [
        { certificate_code: { contains: query.search } },
        { donation: { donor: { full_name: { contains: query.search } } } }
      ];

      if (where.donation) {
        where.AND = [
          { donation: where.donation },
          { OR: searchConditions }
        ];
        delete where.donation;
      } else {
        where.OR = searchConditions;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.donation_certificates.findMany({
        where,
        skip,
        take: limit,
        include: {
          donation: {
            include: {
              donor: { select: { full_name: true, email: true, phone: true, date_of_birth: true, identity_card: true, address: true } },
              facility: { select: { facility_id: true, facility_name: true, seal_image_url: true, signature_image_url: true, director_name: true, director_title: true } },
              blood_type: { select: { blood_type_code: true } }
            }
          },
          approver: { select: { full_name: true } }
        },
        orderBy: { created_at: 'desc' }
      }),
      this.prisma.donation_certificates.count({ where })
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async approveCertificate(certId: number, user: any) {
    const cert = await this.prisma.donation_certificates.findUnique({
      where: { certificate_id: certId },
      include: { donation: { include: { donor: true, facility: true } } }
    });
    if (!cert) throw new NotFoundException('Không tìm thấy chứng nhận');

    // Kiểm tra quyền hạn nếu là nhân viên bệnh viện
    if (user?.role_code === 'HOSPITAL_STAFF' && cert.donation.facility_id !== user.facility_id) {
      throw new ForbiddenException('Bạn chỉ có quyền duyệt chứng nhận của cơ sở y tế mình trực thuộc');
    }

    if (cert.status === 'APPROVED') throw new BadRequestException('Chứng nhận đã được duyệt');

    const sealNumber = `SEAL-${new Date().getFullYear()}-${String(certId).padStart(5, '0')}`;

    const updated = await this.prisma.donation_certificates.update({
      where: { certificate_id: certId },
      data: {
        status: 'APPROVED',
        approved_by: user.user_id,
        approved_at: new Date(),
        seal_number: sealNumber,
        issued_at: new Date()
      }
    });

    // Notify donor
    await this.notificationsService.createNotification({
      user_ids: [cert.donation.donor_user_id],
      title: 'Chứng nhận hiến máu đã được duyệt',
      message: `Chứng nhận hiến máu của bạn (${cert.certificate_code}) tại ${cert.donation.facility?.facility_name || 'cơ sở y tế'} đã được duyệt. Bạn có thể xem và in chứng nhận ngay bây giờ.`,
      notification_type: 'INFO' as any,
      reference_type: 'CERTIFICATE',
      reference_id: certId
    });

    return updated;
  }

  async rejectCertificate(certId: number, user: any, reason: string) {
    const cert = await this.prisma.donation_certificates.findUnique({
      where: { certificate_id: certId },
      include: { donation: { include: { donor: true } } }
    });
    if (!cert) throw new NotFoundException('Không tìm thấy chứng nhận');

    // Kiểm tra quyền hạn nếu là nhân viên bệnh viện
    if (user?.role_code === 'HOSPITAL_STAFF' && cert.donation.facility_id !== user.facility_id) {
      throw new ForbiddenException('Bạn chỉ có quyền từ chối chứng nhận của cơ sở y tế mình trực thuộc');
    }

    if (cert.status === 'APPROVED') throw new BadRequestException('Không thể từ chối chứng nhận đã duyệt');

    const updated = await this.prisma.donation_certificates.update({
      where: { certificate_id: certId },
      data: {
        status: 'REJECTED',
        approved_by: user.user_id,
        approved_at: new Date(),
        reject_reason: reason
      }
    });

    await this.notificationsService.createNotification({
      user_ids: [cert.donation.donor_user_id],
      title: 'Chứng nhận hiến máu bị từ chối',
      message: `Chứng nhận hiến máu của bạn (${cert.certificate_code}) đã bị từ chối. Lý do: ${reason}`,
      notification_type: 'WARNING' as any,
      reference_type: 'CERTIFICATE',
      reference_id: certId
    });

    return updated;
  }

  async getPublicLeaderboard(query: any) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const search = query.search || '';
    const sortBy = query.sortBy || 'donations';
    const sortOrder = query.sortOrder || 'desc';

    const where: any = {
      OR: [
        { is_donor_registered: true },
        { donor_profile: { isNot: null } },
        { donations_donor: { some: { status_code: 'COMPLETED' } } }
      ]
    };
    if (search) {
      where.full_name = { contains: search };
    }

    const users = await this.prisma.users.findMany({
      where,
      select: {
        user_id: true,
        full_name: true,
        avatar_url: true,
        blood_type: { select: { blood_type_code: true } },
        donor_profile: {
          select: {
            total_donations: true,
            blood_type: { select: { blood_type_code: true } }
          }
        },
        donations_donor: {
          where: { status_code: 'COMPLETED' },
          select: { volume_ml: true }
        }
      }
    });

    const mappedUsers = users.map(user => {
      const donationRecordsCount = user.donations_donor.length;
      const profileCount = user.donor_profile?.total_donations || 0;
      const totalDonations = Math.max(donationRecordsCount, profileCount);
      const donationVolume = user.donations_donor.reduce((sum, d) => sum + (d.volume_ml || 0), 0);
      const totalVolume = donationVolume > 0 ? donationVolume : (totalDonations * 350);
      const bloodType = user.blood_type?.blood_type_code || user.donor_profile?.blood_type?.blood_type_code;

      let badgeCount = 0;
      if (totalDonations >= 1) badgeCount++;
      if (totalDonations >= 3) badgeCount++;
      if (totalDonations >= 5) badgeCount++;
      if (totalDonations >= 10) badgeCount++;
      if (bloodType && (bloodType.includes('-') || bloodType === 'AB+')) {
        badgeCount++;
      }

      return {
        userId: user.user_id,
        name: user.full_name,
        avatar: user.avatar_url,
        bloodType: bloodType || null,
        totalDonations,
        totalVolume,
        badgeCount
      };
    });

    let filteredUsers = search ? mappedUsers : mappedUsers.filter(u => u.totalDonations > 0);
    if (filteredUsers.length === 0 && !search) {
      filteredUsers = mappedUsers;
    }

    filteredUsers.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'volume') {
        valA = a.totalVolume; valB = b.totalVolume;
      } else if (sortBy === 'badges') {
        valA = a.badgeCount; valB = b.badgeCount;
      } else {
        valA = a.totalDonations; valB = b.totalDonations;
      }

      if (valA === valB) return 0;
      if (sortOrder === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    const total = filteredUsers.length;
    const data = filteredUsers.slice((page - 1) * limit, page * limit);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const where: any = { status: 'OPEN', date: { gte: today } };
    if (facilityId) where.facility_id = facilityId;

    return await this.prisma.facility_donation_schedules.findMany({
      where,
      include: { facility: true },
      orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
    });
  }

  // --- FACILITY ADMIN ROUTES ---

  // Thứ tự ưu tiên trạng thái: Đã đk → Đã xác nhận → Đã đến → Khám đạt → Đã hiến → còn lại
  private static readonly STATUS_PRIORITY: Record<string, number> = {
    'PENDING': 1,
    'CONFIRMED': 2,
    'ARRIVED': 3,
    'EXAMINED_PASSED': 4,
    'COMPLETED': 5,
    'EXAMINED_FAILED': 6,
    'CANCELLED': 7,
  };

  async getSlots(query: PaginationDto, user: any) {
    const page = query.page || 1;
    const limit = query.limit || 20;

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

    const isDefaultSort = !query.sortBy || query.sortBy === 'status_priority';
    const sortOrder = query.sortOrder || 'desc';

    if (isDefaultSort) {
      const [allData, total] = await Promise.all([
        this.prisma.donor_availability_slots.findMany({
          where,
          include: {
            user: { select: { full_name: true, email: true, phone: true, date_of_birth: true, gender: true, address: true, identity_card: true, blood_type_id: true, donor_profile: { select: { blood_type_id: true } } } },
            schedule: { include: { facility: true } }
          },
          orderBy: [
            { created_at: 'desc' },
            { slot_id: 'desc' },
          ],
        }),
        this.prisma.donor_availability_slots.count({ where }),
      ]);

      allData.sort((a: any, b: any) => {
        const priorityA = DonorService.STATUS_PRIORITY[a.status] ?? 99;
        const priorityB = DonorService.STATUS_PRIORITY[b.status] ?? 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      const skip = (page - 1) * limit;
      const data = allData.slice(skip, skip + limit);

      return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    const skip = (page - 1) * limit;
    let orderBy: any[];
    if (query.sortBy === 'created_at') {
      orderBy = [{ created_at: sortOrder }];
    } else if (query.sortBy === 'status') {
      orderBy = [{ status: sortOrder }, { created_at: 'desc' }];
    } else {
      orderBy = [{ created_at: sortOrder }, { slot_id: 'desc' }];
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
        orderBy,
      }),
      this.prisma.donor_availability_slots.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createAdminSlot(dto: any, user: any) {
    if (user.role_code === 'HOSPITAL_STAFF') {
      if (dto.schedule_id) {
        const schedule = await this.prisma.facility_donation_schedules.findUnique({
          where: { schedule_id: Number(dto.schedule_id) }
        });
        if (schedule?.facility_id !== user.facility_id) {
          throw new BadRequestException('Bạn không có quyền đăng ký cho lịch của cơ sở khác');
        }
      } else {
        throw new BadRequestException('Nhân viên y tế cần chọn lịch hiến máu cụ thể');
      }
    }

    const createdSlot = await this.prisma.donor_availability_slots.create({
      data: {
        user_id: Number(dto.user_id),
        schedule_id: dto.schedule_id ? Number(dto.schedule_id) : undefined,
        specific_date: dto.specific_date ? new Date(dto.specific_date) : null,
        notes: dto.notes,
        status: 'PENDING'
      }
    });

    if (dto.schedule_id) {
      await this.prisma.facility_donation_schedules.update({
        where: { schedule_id: Number(dto.schedule_id) },
        data: { current_donors: { increment: 1 } }
      });
    }

    return createdSlot;
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

    if (dto.status === 'CANCELLED' && slot.status !== 'CANCELLED' && slot.schedule_id) {
      await this.prisma.facility_donation_schedules.update({
        where: { schedule_id: slot.schedule_id },
        data: { current_donors: { decrement: 1 } }
      });
    } else if (slot.status === 'CANCELLED' && dto.status !== 'CANCELLED' && slot.schedule_id) {
      await this.prisma.facility_donation_schedules.update({
        where: { schedule_id: slot.schedule_id },
        data: { current_donors: { increment: 1 } }
      });
    }

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

        if (newStatusId !== matchedRequest.status_id) {
          await tx.blood_request_status_history.create({
            data: {
              request_id: requestId,
              from_status_id: matchedRequest.status_id,
              to_status_id: newStatusId,
              changed_by: user.user_id,
              change_reason: 'Đã nhận đủ máu từ người hiến'
            }
          });
        }
      }

      if (dto.health_check_passed !== false) {
        // Mặc định hạn sử dụng máu là 35 ngày
        const shelfLifeDays = 35;
        const expiryDate = new Date(dto.donation_date);
        expiryDate.setDate(expiryDate.getDate() + shelfLifeDays);

        const inventory = await tx.blood_inventory.create({
          data: {
            bag_code: `BAG-${donationCode}`,
            facility_id: facilityId,
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

        const reminderDaysStr = await this.systemSettingsService.getSettingValue(SystemSettingKey.REMINDER_DAYS_BEFORE_ELIGIBLE, '3');
        const reminderDays = parseInt(reminderDaysStr, 10) || 3;
        const upcomingDate = new Date(nextDate);
        upcomingDate.setDate(upcomingDate.getDate() - reminderDays);

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

      // Auto-create certificate (PENDING — cần admin/staff duyệt)
      const certCode = `BL-${new Date(dto.donation_date).getFullYear()}-${String(donation.donation_id).padStart(5, '0')}`;
      await tx.donation_certificates.create({
        data: {
          donation_id: donation.donation_id,
          certificate_code: certCode,
          status: 'PENDING'
        }
      });

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

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExcelUtil } from '../common/utils/excel.util';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class RequestService {
  private readonly logger = new Logger(RequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronCloseExpiredRequests() {
    this.logger.log('Running daily cron job to close expired blood requests...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const closedStatus = await this.prisma.blood_request_statuses.findFirst({
        where: { status_code: 'CLOSED' }
      });

      if (!closedStatus) return;

      const result = await this.prisma.blood_requests.updateMany({
        where: {
          status: {
            status_code: {
              notIn: ['COMPLETED', 'CANCELLED', 'CLOSED', 'REJECTED']
            }
          },
          required_before: {
            lt: today
          }
        },
        data: {
          status_id: closedStatus.status_id
        }
      });
      
      this.logger.log(`Closed ${result.count} expired blood requests.`);
    } catch (error) {
      this.logger.error('Error auto-closing expired requests', error);
    }
  }

  async createRequest(dto: CreateRequestDto, user: any) {
    const facility_id = user?.role_code === 'HOSPITAL_STAFF' ? user.facility_id : dto.facility_id;
    if (!facility_id) throw new BadRequestException('Vui lòng chọn cơ sở y tế');

    const result = await this.prisma.$transaction(async (tx) => {
      // Tìm status 'pending'
      const pendingStatus = await tx.blood_request_statuses.findFirst({
        where: { status_code: 'PENDING' },
      });

      if (!pendingStatus) throw new Error('System error: pending status not found');

      const requestCode = `RQ-${Date.now()}`;

      // 1. Tạo request
      const request = await tx.blood_requests.create({
        data: {
          request_code: requestCode,
          facility_id: facility_id,
          requester_user_id: user.user_id,
          patient_name: dto.patient_name,
          blood_type_id: dto.blood_type_id,
          component_id: dto.component_id,
          units_needed: dto.units_needed,
          urgency_id: dto.urgency_id,
          status_id: pendingStatus.status_id,
          is_emergency: dto.is_emergency,
          clinical_notes: dto.clinical_notes,
          patient_phone: dto.patient_phone,
          hospital_name: dto.hospital_name,
          ward_room: dto.ward_room,
          province_id: dto.province_id,
          ward_id: dto.ward_id,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          required_before: dto.required_before ? new Date(dto.required_before) : null,
        },
      });

      // 2. Lưu history
      await tx.blood_request_status_history.create({
        data: {
          request_id: request.request_id,
          to_status_id: pendingStatus.status_id,
          changed_by: user.user_id,
          change_reason: 'Tạo yêu cầu mới',
        },
      });

      return request;
    });

    // Gửi thông báo cho Admin
    await this.notificationsService.notifyAdmins(
      'Yêu cầu máu mới',
      `Bệnh nhân ${dto.patient_name} vừa tạo một yêu cầu máu mới (Mã: RQ-${Date.now()}).`,
      NotificationType.WARNING,
      'REQUEST',
      result.request_id
    );

    return result;
  }

  async createPublicRequest(dto: CreateRequestDto, userId: number | null = null) {
    const result = await this.prisma.$transaction(async (tx) => {
      const pendingStatus = await tx.blood_request_statuses.findFirst({
        where: { status_code: 'PENDING' },
      });

      if (!pendingStatus) throw new Error('System error: pending status not found');

      const requestCode = `RQ-${Date.now()}`;

      const request = await tx.blood_requests.create({
        data: {
          request_code: requestCode,
          facility_id: dto.facility_id,
          requester_user_id: userId,
          patient_name: dto.patient_name,
          blood_type_id: dto.blood_type_id,
          component_id: dto.component_id,
          units_needed: dto.units_needed,
          urgency_id: dto.urgency_id,
          status_id: pendingStatus.status_id,
          is_emergency: dto.is_emergency,
          clinical_notes: dto.clinical_notes,
          patient_phone: dto.patient_phone,
          hospital_name: dto.hospital_name,
          ward_room: dto.ward_room,
          province_id: dto.province_id,
          ward_id: dto.ward_id,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          required_before: dto.required_before ? new Date(dto.required_before) : null,
        },
      });

      await tx.blood_request_status_history.create({
        data: {
          request_id: request.request_id,
          to_status_id: pendingStatus.status_id,
          changed_by: null,
          change_reason: 'Người nhà bệnh nhân tạo yêu cầu khẩn cấp',
        },
      });

      return request;
    });

    await this.notificationsService.notifyAdmins(
      'Yêu cầu máu khẩn cấp',
      `Yêu cầu máu công khai (Khẩn cấp) vừa được tạo cho bệnh nhân ${dto.patient_name}.`,
      NotificationType.WARNING,
      'REQUEST',
      result.request_id
    );

    return result;
  }

  async processRequest(requestId: number, user: any) {
    return await this.prisma.$transaction(async (tx) => {
      const request = await tx.blood_requests.findUnique({
        where: { request_id: requestId },
        include: { status: true },
      });

      if (!request) throw new NotFoundException('Request not found');
      if (request.status.status_code.toLowerCase() !== 'pending') {
        throw new BadRequestException('Chỉ có thể xử lý yêu cầu ở trạng thái pending');
      }

      if (user.role_code === 'HOSPITAL_STAFF' && request.facility_id !== user.facility_id) {
        throw new BadRequestException('Bạn không có quyền xử lý yêu cầu của cơ sở khác');
      }

      const availableInventory = await tx.blood_inventory.findMany({
        where: {
          facility_id: request.facility_id,
          blood_type_id: request.blood_type_id,
          component_id: request.component_id,
          status_code: 'AVAILABLE',
        },
        take: request.units_needed,
      });

      if (availableInventory.length >= request.units_needed) {
        // ĐỦ MÁU -> Cấp từ kho
        const allocatedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'ALLOCATED' } });

        // Cập nhật trạng thái request
        await tx.blood_requests.update({
          where: { request_id: requestId },
          data: { status_id: allocatedStatus!.status_id, assigned_staff_id: user.user_id },
        });

        for (const bag of availableInventory) {
          // Khóa túi máu
          await tx.blood_inventory.update({
            where: { inventory_id: bag.inventory_id },
            data: { status_code: 'RESERVED' },
          });

          // Ghi phân bổ
          await tx.blood_request_inventory_allocations.create({
            data: { request_id: requestId, inventory_id: bag.inventory_id, allocated_by: user.user_id },
          });

          // Ghi lịch sử kho
          await tx.inventory_transactions.create({
            data: { inventory_id: bag.inventory_id, transaction_type: 'RESERVE', reference_type: 'REQUEST', reference_id: requestId, performed_by: user.user_id },
          });
        }

        // Lưu history request
        await tx.blood_request_status_history.create({
          data: { request_id: requestId, from_status_id: request.status_id, to_status_id: allocatedStatus!.status_id, changed_by: user.user_id, change_reason: 'Kho đủ máu, đã phân bổ' },
        });

        if (request.requester_user_id) {
          await this.notificationsService.createNotification({
            user_ids: [request.requester_user_id],
            title: 'Yêu cầu của bạn đã được phân bổ',
            message: `Yêu cầu máu cho bệnh nhân ${request.patient_name} đã có đủ máu từ kho và đang được chuẩn bị.`,
            notification_type: NotificationType.INFO,
            reference_type: 'REQUEST',
            reference_id: requestId
          });
        }

        return { success: true, message: 'Đã cấp đủ máu từ kho.' };

      } else {
        const matchingStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'APPROVED' } });

        await tx.blood_requests.update({
          where: { request_id: requestId },
          data: { status_id: matchingStatus!.status_id, assigned_staff_id: user.user_id },
        });

        await tx.blood_request_status_history.create({
          data: { request_id: requestId, from_status_id: request.status_id, to_status_id: matchingStatus!.status_id, changed_by: user.user_id, change_reason: 'Kho thiếu máu, bắt đầu tìm người hiến' },
        });

        this.eventEmitter.emit('request.match_donors', { requestId, facilityId: request.facility_id, bloodTypeId: request.blood_type_id });

        if (request.requester_user_id) {
          await this.notificationsService.createNotification({
            user_ids: [request.requester_user_id],
            title: 'Yêu cầu của bạn đang tìm người hiến',
            message: `Hiện tại kho đang thiếu nhóm máu yêu cầu. Hệ thống đã tự động chuyển sang chế độ tìm người hiến máu phù hợp.`,
            notification_type: NotificationType.WARNING,
            reference_type: 'REQUEST',
            reference_id: requestId
          });
        }

        return { success: true, message: 'Kho thiếu máu. Đã chuyển sang chế độ tìm kiếm người hiến.' };
      }
    });
  }

  async getRequestByCode(code: string) {
    const request = await this.prisma.blood_requests.findFirst({
      where: { request_code: code },
      include: {
        facility: true,
        blood_type: true,
        component: true,
        status: true,
        urgency: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu máu với mã này');
    }

    const registeredDonorsCount = await this.prisma.donor_availability_slots.count({
      where: {
        notes: { contains: request.request_code },
        status: { notIn: ['CANCELLED', 'REJECTED'] }
      }
    });

    return { ...request, registered_donors_count: registeredDonorsCount };
  }

  async getRequests(query: any, user?: any) {
    try {
      await this.handleCronCloseExpiredRequests();
    } catch (e) {
      this.logger.error('Failed to auto-close requests before fetch', e);
    }
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status_id) where.status_id = Number(query.status_id);
    if (user?.role_code === 'HOSPITAL_STAFF') {
      where.facility_id = user.facility_id || -1;
    } else if (query.facility_id) {
      where.facility_id = Number(query.facility_id);
    }
    if (query.urgency_id) where.urgency_id = Number(query.urgency_id);
    if (query.requester_user_id) where.requester_user_id = Number(query.requester_user_id);
    if (query.search) {
      where.patient_name = { contains: query.search };
    }

    if (query.is_public_view) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.OR = [
        { required_before: { gte: today } },
        { required_before: null }
      ];
      where.status = {
        status_code: {
          notIn: ['COMPLETED', 'CANCELLED', 'CLOSED', 'REJECTED']
        }
      };
    }

    // Xử lý sorting
    const isDefaultSort = !query.sortBy || query.sortBy === 'default';
    const sortOrder = query.sortOrder || 'desc';
    let orderBy: any = [];

    if (isDefaultSort) {
      // Mặc định: Ưu tiên khẩn cấp nhất (priority_level cao), sau đó đến trạng thái, cuối cùng là thời gian
      orderBy = [
        { urgency: { priority_level: 'desc' } },
        { status: { sort_order: 'asc' } },
        { created_at: 'desc' }
      ];
    } else if (query.sortBy === 'urgency') {
      orderBy = [
        { urgency: { priority_level: sortOrder } },
        { created_at: 'desc' }
      ];
    } else if (query.sortBy === 'status') {
      orderBy = [
        { status: { sort_order: sortOrder } },
        { created_at: 'desc' }
      ];
    } else if (query.sortBy === 'created_at') {
      orderBy = [{ created_at: sortOrder }];
    } else {
      orderBy = [{ created_at: 'desc' }];
    }

    const [data, total] = await Promise.all([
      this.prisma.blood_requests.findMany({
        where,
        include: {
          facility: true,
          blood_type: true,
          component: true,
          status: true,
          urgency: true,
          requester: { select: { full_name: true, email: true } },
          status_history: {
            include: {
              from_status: true,
              to_status: true,
              user: { select: { full_name: true, email: true } }
            },
            orderBy: { created_at: 'desc' }
          },
          blood_request_donor_matches: true
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.blood_requests.count({ where }),
    ]);

    const enhancedData = await Promise.all(data.map(async (req) => {
      const registeredDonorsCount = await this.prisma.donor_availability_slots.count({
        where: {
          notes: { contains: req.request_code },
          status: { notIn: ['CANCELLED', 'REJECTED'] }
        }
      });
      return { ...req, registered_donors_count: registeredDonorsCount };
    }));

    return {
      data: enhancedData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // --- EXCEL FEATURE ---

  async exportExcel(query: any, user?: any): Promise<Buffer> {
    const list = await this.getRequests({ ...query, limit: 10000 }, user);
    const data = list.data.map((item: any) => ({
      'Mã YC': item.request_code,
      'Cơ sở (ID)': item.facility_id,
      'Tên bệnh nhân': item.patient_name,
      'Nhóm máu (ID)': item.blood_type_id,
      'Thành phần (ID)': item.component_id,
      'Độ khẩn (ID)': item.urgency_id,
      'Cần (Đơn vị)': item.units_needed,
      'Trạng thái': item.status?.status_name || '',
      'Ghi chú': item.clinical_notes || ''
    }));
    return ExcelUtil.generateExcel(data, 'YeuCauMau');
  }

  async getTemplate(): Promise<Buffer> {
    const headers = [
      'Cơ sở (ID)',
      'Tên bệnh nhân',
      'Nhóm máu (ID)',
      'Thành phần (ID)',
      'Độ khẩn (ID)',
      'Cần (Đơn vị)',
      'Ghi chú'
    ];
    return ExcelUtil.generateTemplate(headers, 'Template_YeuCauMau');
  }

  async importExcel(buffer: Buffer, user: any) {
    const data = ExcelUtil.parseExcel(buffer);
    let success = 0;
    let failed = 0;

    const pendingStatus = await this.prisma.blood_request_statuses.findFirst({
      where: { status_code: 'PENDING' },
    });

    const urgencies = await this.prisma.urgency_levels.findMany();

    for (const row of data) {
      try {
        let facilityId = Number(row['Cơ sở (ID)']);
        if (user.role_code === 'HOSPITAL_STAFF') facilityId = user.facility_id;
        const patientName = row['Tên bệnh nhân'];
        const bloodTypeId = Number(row['Nhóm máu (ID)']);
        const componentId = Number(row['Thành phần (ID)']);
        const urgencyId = Number(row['Độ khẩn (ID)']);
        const unitsNeeded = Number(row['Cần (Đơn vị)']);
        const notes = row['Ghi chú'] || null;

        if (!facilityId || !patientName || !bloodTypeId || !componentId || !urgencyId || !unitsNeeded) {
          failed++;
          continue;
        }

        const requestCode = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const urgency = urgencies.find(u => u.urgency_id === urgencyId);

        const request = await this.prisma.blood_requests.create({
          data: {
            request_code: requestCode,
            facility_id: facilityId,
            patient_name: patientName,
            blood_type_id: bloodTypeId,
            component_id: componentId,
            urgency_id: urgencyId,
            units_needed: unitsNeeded,
            units_fulfilled: 0,
            clinical_notes: notes,
            status_id: pendingStatus?.status_id || 1, // Pending
            is_emergency: urgency?.urgency_code === 'CRITICAL'
          }
        });

        await this.prisma.blood_request_status_history.create({
          data: {
            request_id: request.request_id,
            to_status_id: pendingStatus?.status_id || 1,
            changed_by: user.user_id,
            change_reason: 'Nhập từ file Excel'
          }
        });

        success++;
      } catch (err) {
        failed++;
      }
    }

    return { message: `Import hoàn tất. Thành công: ${success}, Thất bại/Bỏ qua: ${failed}` };
  }

  async updateRequest(requestId: number, dto: Partial<CreateRequestDto>, user: any) {
    const req = await this.prisma.blood_requests.findUnique({ where: { request_id: requestId }, include: { status: true } });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu');
    if (user.role_code === 'HOSPITAL_STAFF' && req.facility_id !== user.facility_id) {
      throw new BadRequestException('Bạn không có quyền sửa yêu cầu này');
    }
    if (req.status.status_code.toLowerCase() !== 'pending') {
      throw new BadRequestException('Chỉ có thể sửa yêu cầu ở trạng thái pending');
    }
    return await this.prisma.blood_requests.update({
      where: { request_id: requestId },
      data: {
        facility_id: user.role_code === 'HOSPITAL_STAFF' ? undefined : dto.facility_id,
        patient_name: dto.patient_name,
        blood_type_id: dto.blood_type_id,
        component_id: dto.component_id,
        units_needed: dto.units_needed,
        urgency_id: dto.urgency_id,
        is_emergency: dto.is_emergency,
        clinical_notes: dto.clinical_notes,
        patient_phone: dto.patient_phone,
        hospital_name: dto.hospital_name,
        ward_room: dto.ward_room,
        province_id: dto.province_id,
        ward_id: dto.ward_id,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        required_before: dto.required_before ? new Date(dto.required_before) : undefined,
      }
    });
  }

  async deleteRequest(requestId: number, user: any) {
    const req = await this.prisma.blood_requests.findUnique({ where: { request_id: requestId }, include: { status: true } });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu');
    if (user.role_code === 'HOSPITAL_STAFF' && req.facility_id !== user.facility_id) {
      throw new BadRequestException('Bạn không có quyền xóa yêu cầu này');
    }
    if (!['pending', 'matching_donors'].includes(req.status.status_code.toLowerCase())) {
      throw new BadRequestException('Chỉ có thể xóa yêu cầu ở trạng thái pending hoặc đang tìm người hiến');
    }
    await this.prisma.blood_request_donor_matches.deleteMany({ where: { request_id: requestId } });
    await this.prisma.blood_request_status_history.deleteMany({ where: { request_id: requestId } });
    await this.prisma.blood_request_inventory_allocations.deleteMany({ where: { request_id: requestId } });
    return await this.prisma.blood_requests.delete({ where: { request_id: requestId } });
  }

  async cancelRequest(requestId: number, user: any) {
    const req = await this.prisma.blood_requests.findUnique({ where: { request_id: requestId }, include: { status: true } });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu');
    if (user.role_code === 'HOSPITAL_STAFF' && req.facility_id !== user.facility_id) {
      throw new BadRequestException('Bạn không có quyền hủy yêu cầu này');
    }
    if (!['pending', 'matching_donors'].includes(req.status.status_code.toLowerCase())) {
      throw new BadRequestException('Chỉ có thể hủy yêu cầu ở trạng thái pending hoặc đang tìm người hiến');
    }
    const cancelledStatus = await this.prisma.blood_request_statuses.findFirst({ where: { status_code: 'cancelled' } });
    if (!cancelledStatus) throw new BadRequestException('Không tìm thấy trạng thái cancelled trong hệ thống');

    const updated = await this.prisma.blood_requests.update({
      where: { request_id: requestId },
      data: { status_id: cancelledStatus.status_id }
    });

    await this.prisma.blood_request_status_history.create({
      data: { request_id: requestId, from_status_id: req.status_id, to_status_id: cancelledStatus.status_id, changed_by: user.user_id, change_reason: 'Người dùng hủy yêu cầu' }
    });

    return updated;
  }

  async getRequestById(requestId: number, userId: number) {
    const request = await this.prisma.blood_requests.findUnique({
      where: { request_id: requestId },
      include: {
        facility: true,
        blood_type: true,
        component: true,
        status: true,
        urgency: true,
        requester: { select: { full_name: true, email: true, phone: true } },
        status_history: {
          include: {
            from_status: true,
            to_status: true,
            user: { select: { full_name: true, email: true } }
          },
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!request) {
      throw new BadRequestException('Yêu cầu không tồn tại');
    }

    if (request.requester_user_id !== userId) {
      throw new BadRequestException('Bạn không có quyền xem yêu cầu này');
    }

    return request;
  }

  // --- MATCHING & ALLOCATION (ADMIN) ---

  async getMatches(requestId: number, user?: any) {
    if (user?.role_code === 'HOSPITAL_STAFF') {
      const req = await this.prisma.blood_requests.findUnique({ where: { request_id: requestId } });
      if (req?.facility_id !== user.facility_id) throw new BadRequestException('Bạn không có quyền xem thông tin này');
    }
    return await this.prisma.blood_request_donor_matches.findMany({
      where: { request_id: requestId },
      include: {
        donor: { select: { full_name: true, email: true, phone: true, blood_type: true } }
      },
      orderBy: { match_score: 'desc' }
    });
  }

  async findDonorMatches(requestId: number, user?: any) {
    const request = await this.prisma.blood_requests.findUnique({
      where: { request_id: requestId },
      include: {
        facility: true,
        blood_type: true
      }
    });

    if (!request) throw new NotFoundException('Yêu cầu không tồn tại');
    if (user?.role_code === 'HOSPITAL_STAFF' && request.facility_id !== user.facility_id) {
      throw new BadRequestException('Bạn không có quyền thao tác trên yêu cầu này');
    }

    // Bug 1 fix: Query blood_compatibility để lấy tất cả donor blood type tương thích
    const compatibleEntries = await this.prisma.blood_compatibility.findMany({
      where: {
        component_id: request.component_id,
        recipient_blood_type_id: request.blood_type_id,
        is_compatible: true
      },
      select: { donor_blood_type_id: true }
    });

    const compatibleBloodTypeIds = compatibleEntries.map(e => e.donor_blood_type_id);

    if (compatibleBloodTypeIds.length === 0) {
      // Fallback: nếu không có data compatibility, dùng cùng nhóm máu
      compatibleBloodTypeIds.push(request.blood_type_id);
    }

    const matchingDonors = await this.prisma.users.findMany({
      where: {
        blood_type_id: { in: compatibleBloodTypeIds },
        is_donor_registered: true,
        is_active: true,
        blood_request_donor_matches: {
          none: {
            request_id: requestId,
            match_status: { in: ['PENDING', 'CONTACTED', 'ACCEPTED'] }
          }
        }
      },
      include: {
        donations_donor: {
          orderBy: { donation_date: 'desc' },
          take: 1
        }
      }
    });

    if (matchingDonors.length === 0) {
      return { message: 'Không tìm thấy người hiến máu phù hợp lúc này', count: 0 };
    }

    // Bug 2 fix: Lấy quy tắc khoảng cách hiến từ DB thay vì hardcode
    const intervalRule = await this.prisma.donation_interval_rules.findFirst({
      where: { component_id: request.component_id, is_active: true }
    });
    const minIntervalDays = intervalRule?.min_interval_days || 56;

    // B3: Lấy bán kính tìm kiếm từ system_settings
    const radiusSetting = await this.prisma.system_settings.findFirst({
      where: { setting_key: 'max_search_radius_km' }
    });
    const maxRadiusKm = radiusSetting ? parseFloat(radiusSetting.setting_value) : 50;

    const matchesData = [];

    for (const donor of matchingDonors) {
      let score = 100;

      // Điểm nhóm máu: cùng nhóm = 100, tương thích chéo = trừ 10
      if (donor.blood_type_id !== request.blood_type_id) {
        score -= 10;
      }

      if (!donor.is_available_for_donation) score -= 30;

      // Bug 2 fix: Dùng minIntervalDays từ donation_interval_rules
      if (donor.donations_donor && donor.donations_donor.length > 0) {
        const lastDonation = new Date(donor.donations_donor[0].donation_date);
        const daysSinceLast = (new Date().getTime() - lastDonation.getTime()) / (1000 * 3600 * 24);

        if (daysSinceLast < minIntervalDays) {
          continue;
        } else if (daysSinceLast < minIntervalDays * 1.5) {
          score -= 10;
        }
      }

      // B3: Tính khoảng cách nếu có tọa độ
      let distanceKm: number | null = null;
      if (request.latitude && request.longitude && donor.latitude && donor.longitude) {
        distanceKm = this.calculateHaversineDistance(
          Number(request.latitude), Number(request.longitude),
          Number(donor.latitude), Number(donor.longitude)
        );

        // Bỏ qua donor ngoài bán kính
        if (distanceKm > maxRadiusKm) continue;

        // Scoring theo khoảng cách
        if (distanceKm <= 5) score += 10;
        else if (distanceKm <= 10) score += 5;
        else if (distanceKm > 20) score -= 15;
        else if (distanceKm > 10) score -= 5;
      }

      matchesData.push({
        request_id: requestId,
        donor_user_id: donor.user_id,
        match_score: Math.max(0, Math.min(100, score)),
        match_status: 'PENDING',
        distance_km: distanceKm
      });
    }

    if (matchesData.length === 0) {
      return { message: 'Không tìm thấy người hiến máu đủ điều kiện lúc này', count: 0 };
    }

    await this.prisma.blood_request_donor_matches.createMany({
      data: matchesData
    });

    // B4: Gửi email thông báo cho những donor được match
    for (const match of matchesData) {
      const donor = matchingDonors.find(d => d.user_id === match.donor_user_id);
      if (donor && donor.email) {
        await this.mailService.sendDonorMatchEmail(
          donor.email,
          donor.full_name,
          request.patient_name,
          request.blood_type.blood_type_code,
          request.facility.facility_name,
          request.facility.address
        );
      }
    }

    return { message: `Đã tìm thấy và tạo ${matchesData.length} ghép nối tiềm năng`, count: matchesData.length };
  }

  // B3: Haversine formula để tính khoảng cách (km)
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Bán kính trái đất (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  async updateMatchStatus(matchId: number, status: string, user?: any) {
    const match = await this.prisma.blood_request_donor_matches.findUnique({
      where: { match_id: matchId },
      include: { request: true }
    });
    if (!match) throw new NotFoundException('Không tìm thấy ghép nối');
    if (user?.role_code === 'HOSPITAL_STAFF' && match.request?.facility_id !== user.facility_id) {
      throw new BadRequestException('Bạn không có quyền thao tác');
    }

    return await this.prisma.blood_request_donor_matches.update({
      where: { match_id: matchId },
      data: { match_status: status }
    });
  }

  async getAllocations(requestId: number, user?: any) {
    if (user?.role_code === 'HOSPITAL_STAFF') {
      const req = await this.prisma.blood_requests.findUnique({ where: { request_id: requestId } });
      if (req?.facility_id !== user.facility_id) throw new BadRequestException('Bạn không có quyền xem thông tin này');
    }
    return await this.prisma.blood_request_inventory_allocations.findMany({
      where: { request_id: requestId, is_active: true },
      include: {
        inventory: { include: { blood_type: true, component: true } },
        user: { select: { full_name: true } }
      }
    });
  }

  async allocateInventory(requestId: number, inventoryIds: number[], user: any) {
    return await this.prisma.$transaction(async (tx) => {
      const request = await tx.blood_requests.findUnique({ where: { request_id: requestId } });
      if (!request) throw new NotFoundException('Yêu cầu không tồn tại');
      if (user.role_code === 'HOSPITAL_STAFF' && request.facility_id !== user.facility_id) {
        throw new BadRequestException('Bạn không có quyền cấp phát cho yêu cầu này');
      }

      const bags = await tx.blood_inventory.findMany({
        where: { inventory_id: { in: inventoryIds }, status_code: 'AVAILABLE' }
      });

      if (bags.length !== inventoryIds.length) {
        throw new BadRequestException('Một hoặc nhiều túi máu không hợp lệ hoặc không có sẵn');
      }

      let allocatedCount = 0;

      for (const bag of bags) {
        // Change bag status
        await tx.blood_inventory.update({
          where: { inventory_id: bag.inventory_id },
          data: { status_code: 'RESERVED' }
        });

        // Create allocation record
        await tx.blood_request_inventory_allocations.create({
          data: {
            request_id: requestId,
            inventory_id: bag.inventory_id,
            allocated_by: user.user_id,
            is_active: true
          }
        });

        // Record transaction
        await tx.inventory_transactions.create({
          data: {
            inventory_id: bag.inventory_id,
            transaction_type: 'RESERVE',
            reference_type: 'REQUEST',
            reference_id: requestId,
            performed_by: user.user_id,
            notes: `Cấp phát thủ công cho yêu cầu ${request.request_code}`
          }
        });

        allocatedCount++;
      }

      // Update request fulfilled units
      const newFulfilled = request.units_fulfilled + allocatedCount;
      const dataToUpdate: any = { units_fulfilled: newFulfilled };

      // If fully fulfilled, update status to COMPLETED
      if (newFulfilled >= request.units_needed) {
        const completedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'completed' } });
        if (completedStatus) {
          dataToUpdate.status_id = completedStatus.status_id;
          dataToUpdate.completed_at = new Date();

          await tx.blood_request_status_history.create({
            data: {
              request_id: requestId,
              from_status_id: request.status_id,
              to_status_id: completedStatus.status_id,
              changed_by: user.user_id,
              change_reason: 'Đã cấp phát đủ máu'
            }
          });
        }
      } else {
        const allocatedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'allocated_stock' } });
        if (allocatedStatus && request.status_id !== allocatedStatus.status_id) {
          dataToUpdate.status_id = allocatedStatus.status_id;
          await tx.blood_request_status_history.create({
            data: {
              request_id: requestId,
              from_status_id: request.status_id,
              to_status_id: allocatedStatus.status_id,
              changed_by: user.user_id,
              change_reason: 'Đã cấp phát một phần máu'
            }
          });
        }
      }

      await tx.blood_requests.update({
        where: { request_id: requestId },
        data: dataToUpdate
      });

      return { message: `Đã cấp phát thành công ${allocatedCount} đơn vị máu` };
    });
  }

  async releaseAllocation(allocationId: number, user: any) {
    return await this.prisma.$transaction(async (tx) => {
      const allocation = await tx.blood_request_inventory_allocations.findUnique({
        where: { allocation_id: allocationId },
        include: { request: true }
      });

      if (!allocation || !allocation.is_active) {
        throw new NotFoundException('Phân bổ không tồn tại hoặc đã được giải phóng');
      }

      if (user.role_code === 'HOSPITAL_STAFF' && allocation.request?.facility_id !== user.facility_id) {
        throw new BadRequestException('Bạn không có quyền giải phóng phân bổ này');
      }

      // Release bag back to inventory
      await tx.blood_inventory.update({
        where: { inventory_id: allocation.inventory_id },
        data: { status_code: 'AVAILABLE' }
      });

      // Update allocation
      await tx.blood_request_inventory_allocations.update({
        where: { allocation_id: allocationId },
        data: { is_active: false, released_at: new Date() }
      });

      // Record transaction
      await tx.inventory_transactions.create({
        data: {
          inventory_id: allocation.inventory_id,
          transaction_type: 'RELEASE',
          reference_type: 'ALLOCATION',
          reference_id: allocationId,
          performed_by: user.user_id,
          notes: 'Giải phóng phân bổ máu'
        }
      });

      // Update request fulfilled units
      const request = await tx.blood_requests.findUnique({ where: { request_id: allocation.request_id } });
      if (request && request.units_fulfilled > 0) {
        const newFulfilled = request.units_fulfilled - 1;
        const dataToUpdate: any = { units_fulfilled: newFulfilled };

        // Revert status if it was COMPLETED or ALLOCATED but now lacks units
        const completedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'completed' } });
        const allocatedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'allocated_stock' } });
        const approvedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'matching_donors' } });

        let newStatusId = request.status_id;
        let newStatusName = '';

        if (newFulfilled === 0 && approvedStatus) {
          newStatusId = approvedStatus.status_id;
          newStatusName = 'APPROVED';
        } else if (newFulfilled > 0 && newFulfilled < request.units_needed && allocatedStatus) {
          newStatusId = allocatedStatus.status_id;
          newStatusName = 'ALLOCATED';
        }

        if (newStatusId !== request.status_id) {
          dataToUpdate.status_id = newStatusId;
          await tx.blood_request_status_history.create({
            data: {
              request_id: request.request_id,
              from_status_id: request.status_id,
              to_status_id: newStatusId,
              changed_by: user.user_id,
              change_reason: `Thu hồi máu, chuyển trạng thái về ${newStatusName}`
            }
          });
        }

        await tx.blood_requests.update({
          where: { request_id: request.request_id },
          data: dataToUpdate
        });
      }

      return { message: 'Đã giải phóng phân bổ máu thành công' };
    });
  }

  @OnEvent('request.match_donors')
  async handleMatchDonorsEvent(payload: { requestId: number, facilityId: number, bloodTypeId: number }) {
    try {
      await this.findDonorMatches(payload.requestId);
    } catch (error) {
      this.logger.error('Lỗi khi tự động tìm người hiến máu:', error);
    }
  }

  // --- CRON JOB: Tự động đánh dấu yêu cầu máu hết hạn ---
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronExpireRequests() {
    this.logger.log('Kiểm tra yêu cầu máu hết hạn (required_before)...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const activeStatuses = await this.prisma.blood_request_statuses.findMany({
        where: { status_code: { in: ['pending', 'matching_donors', 'allocated_stock'] } }
      });
      const activeStatusIds = activeStatuses.map(s => s.status_id);

      const expiredStatus = await this.prisma.blood_request_statuses.findFirst({
        where: { status_code: 'expired' }
      });

      if (!expiredStatus) return;

      const overdueRequests = await this.prisma.blood_requests.findMany({
        where: {
          required_before: { lt: today },
          status_id: { in: activeStatusIds }
        }
      });

      if (overdueRequests.length === 0) {
        this.logger.log('Không có yêu cầu máu nào quá hạn.');
        return;
      }

      for (const req of overdueRequests) {
        await this.prisma.blood_requests.update({
          where: { request_id: req.request_id },
          data: { status_id: expiredStatus.status_id }
        });

        await this.prisma.blood_request_status_history.create({
          data: {
            request_id: req.request_id,
            from_status_id: req.status_id,
            to_status_id: expiredStatus.status_id,
            changed_by: null, // Hệ thống tự thay đổi
            change_reason: 'Quá hạn (required_before) nên hệ thống tự đóng'
          }
        });

        // Hủy các phân bổ (nếu có)
        const allocations = await this.prisma.blood_request_inventory_allocations.findMany({
          where: { request_id: req.request_id, is_active: true }
        });
        
        for (const allocation of allocations) {
          // Trả máu về kho
          await this.prisma.blood_inventory.update({
            where: { inventory_id: allocation.inventory_id },
            data: { status_code: 'AVAILABLE' }
          });
          // Ghi nhận
          await this.prisma.blood_request_inventory_allocations.update({
            where: { allocation_id: allocation.allocation_id },
            data: { is_active: false, released_at: new Date() }
          });
          await this.prisma.inventory_transactions.create({
            data: {
              inventory_id: allocation.inventory_id,
              transaction_type: 'RELEASE',
              reference_type: 'SYSTEM_CRON',
              reference_id: req.request_id,
              notes: 'Tự động thu hồi do yêu cầu hết hạn'
            }
          });
        }
      }

      this.logger.log(`Đã đóng ${overdueRequests.length} yêu cầu máu quá hạn.`);
    } catch (error) {
      this.logger.error('Lỗi khi chạy cron expire requests', error);
    }
  }
}

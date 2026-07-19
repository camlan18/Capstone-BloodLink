import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ExcelUtil } from '../common/utils/excel.util';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

@Injectable()
export class RequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
  ) {}

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

      // Kiểm tra kho máu (Tìm các túi máu AVAILABLE)
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
        const allocatedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'ALLOCATED' }});
        
        // Cập nhật trạng thái request
        await tx.blood_requests.update({
          where: { request_id: requestId },
          data: { status_id: allocatedStatus!.status_id, fulfilled_from_stock: true, assigned_staff_id: user.user_id },
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
        // THIẾU MÁU -> Chuyển sang tìm người hiến (Matching Donors)
        const matchingStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'APPROVED' }});
        
        await tx.blood_requests.update({
          where: { request_id: requestId },
          data: { status_id: matchingStatus!.status_id, needs_donor_match: true, assigned_staff_id: user.user_id },
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
        orderBy: { created_at: 'desc' },
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
    if (!['pending', 'approved'].includes(req.status.status_code.toLowerCase())) {
      throw new BadRequestException('Chỉ có thể xóa yêu cầu ở trạng thái pending hoặc approved');
    }
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
    if (!['pending', 'approved'].includes(req.status.status_code.toLowerCase())) {
      throw new BadRequestException('Chỉ có thể hủy yêu cầu ở trạng thái pending hoặc approved');
    }
    // Search for a rejected or cancelled status
    let rejectStatus = await this.prisma.blood_request_statuses.findUnique({ where: { status_code: 'rejected' } });
    if (!rejectStatus) {
      rejectStatus = await this.prisma.blood_request_statuses.findFirst({ where: { status_code: { contains: 'reject' } } });
    }
    if (!rejectStatus) throw new BadRequestException('Không tìm thấy trạng thái rejected trong hệ thống');

    const updated = await this.prisma.blood_requests.update({
      where: { request_id: requestId },
      data: { status_id: rejectStatus.status_id }
    });
    
    await this.prisma.blood_request_status_history.create({
      data: { request_id: requestId, from_status_id: req.status_id, to_status_id: rejectStatus.status_id, changed_by: user.user_id, change_reason: 'Người dùng hủy yêu cầu' }
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
      where: { request_id: requestId }
    });

    if (!request) throw new NotFoundException('Yêu cầu không tồn tại');
    if (user?.role_code === 'HOSPITAL_STAFF' && request.facility_id !== user.facility_id) {
      throw new BadRequestException('Bạn không có quyền thao tác trên yêu cầu này');
    }

    // Find donors with matching blood type and are available
    const matchingDonors = await this.prisma.users.findMany({
      where: {
        blood_type_id: request.blood_type_id,
        is_available_for_donation: true,
        // Exclude users who already have a pending or accepted match for this request
        blood_request_donor_matches: {
          none: {
            request_id: requestId,
            match_status: { in: ['PENDING', 'CONTACTED', 'ACCEPTED'] }
          }
        }
      }
    });

    if (matchingDonors.length === 0) {
      return { message: 'Không tìm thấy người hiến máu phù hợp lúc này', count: 0 };
    }

    // Create matches
    const matchesData = matchingDonors.map(donor => ({
      request_id: requestId,
      donor_user_id: donor.user_id,
      match_score: 100, // Basic score
      match_status: 'PENDING'
    }));

    await this.prisma.blood_request_donor_matches.createMany({
      data: matchesData
    });

    return { message: `Đã tìm thấy và tạo ${matchingDonors.length} ghép nối tiềm năng`, count: matchingDonors.length };
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
        const completedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'COMPLETED' } });
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
        const allocatedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'ALLOCATED' } });
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
        const completedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'COMPLETED' } });
        const allocatedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'ALLOCATED' } });
        const approvedStatus = await tx.blood_request_statuses.findFirst({ where: { status_code: 'APPROVED' } });
        
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
      console.error('Lỗi khi tự động tìm người hiến máu:', error);
    }
  }
}

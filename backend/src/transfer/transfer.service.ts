import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

/**
 * Service xử lý nghiệp vụ phiếu điều chuyển máu giữa các cơ sở y tế (tạo, duyệt, xuất, nhận, hủy và hết hạn).
 */
@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generate transfer code: TRF-YYYYMMDD-XXXX
   */
  private generateTransferCode(): string {
    // Ghép ngày hiện tại YYYYMMDD với 4 chữ số ngẫu nhiên để tạo mã phiếu TRF duy nhất
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `TRF-${dateStr}-${rand}`;
  }

  /**
   * 1. Tạo phiếu yêu cầu chuyển máu (PENDING)
   * Cơ sở đang thiếu máu tạo yêu cầu gửi đến cơ sở có máu
   */
  async createTransfer(dto: CreateTransferDto, user: any) {
    // B1: Chặn trường hợp cơ sở xuất và cơ sở nhận trùng nhau
    if (dto.from_facility_id === dto.to_facility_id) {
      throw new BadRequestException('Cơ sở xuất và cơ sở nhận không được trùng nhau');
    }

    // B2: Truy vấn song song và kiểm tra cả hai cơ sở y tế đều tồn tại
    // Verify both facilities exist
    const [fromFac, toFac] = await Promise.all([
      this.prisma.medical_facilities.findUnique({ where: { facility_id: dto.from_facility_id } }),
      this.prisma.medical_facilities.findUnique({ where: { facility_id: dto.to_facility_id } }),
    ]);

    if (!fromFac) throw new BadRequestException('Cơ sở xuất không tồn tại');
    if (!toFac) throw new BadRequestException('Cơ sở nhận không tồn tại');

    // B3: Đảm bảo hạn cần máu (nếu có) cách thời điểm hiện tại ít nhất 2 giờ
    // Validation cho required_before (phải cách hiện tại ít nhất 2h)
    if ((dto as any).required_before) {
      const requiredDate = new Date((dto as any).required_before);
      const twoHoursFromNow = new Date();
      twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2);
      if (requiredDate < twoHoursFromNow) {
        throw new BadRequestException('Thời gian cần trước phải cách thời điểm hiện tại ít nhất 2 giờ');
      }
    }

    // B4: Nếu phiếu chỉ định sẵn túi máu, kiểm tra túi thuộc cơ sở xuất và đang AVAILABLE
    // If specific inventory_id is provided, validate it
    if (dto.inventory_id) {
      const inv = await this.prisma.blood_inventory.findUnique({
        where: { inventory_id: dto.inventory_id },
      });
      if (!inv) throw new BadRequestException('Túi máu không tồn tại');
      if (inv.facility_id !== dto.from_facility_id) {
        throw new BadRequestException('Túi máu không thuộc cơ sở xuất');
      }
      if (inv.status_code !== 'AVAILABLE') {
        throw new BadRequestException(`Túi máu đang ở trạng thái ${inv.status_code}, không thể chuyển`);
      }
    }

    // B5: Lưu phiếu điều chuyển mới ở trạng thái PENDING
    const transfer = await this.prisma.blood_transfers.create({
      data: {
        transfer_code: this.generateTransferCode(),
        from_facility_id: dto.from_facility_id,
        to_facility_id: dto.to_facility_id,
        blood_type_id: dto.blood_type_id,
        component_id: dto.component_id,
        inventory_id: dto.inventory_id || null,
        units_requested: dto.units_requested || 1,
        status: 'PENDING',
        reason: dto.reason || null,
        notes: dto.notes || null,
        required_before: (dto as any).required_before ? new Date((dto as any).required_before) : null,
        requested_by: user.user_id,
      },
      include: {
        from_facility: true,
        to_facility: true,
        blood_type: true,
        component: true,
      },
    });

    // B6: Gửi thông báo cho nhân viên/admin tại cơ sở xuất (lỗi gửi thông báo không làm hủy phiếu)
    // Notify staff of the source facility
    try {
      const staffOfSource = await this.prisma.users.findMany({
        where: {
          facility_id: dto.from_facility_id,
          is_active: true,
          role: { role_code: { in: ['ADMIN', 'STAFF', 'HOSPITAL_STAFF'] } },
        },
        select: { user_id: true },
      });

      for (const staff of staffOfSource) {
        await this.notificationsService.createNotification({
          user_ids: [staff.user_id],
          title: `Yêu cầu chuyển máu mới: ${transfer.transfer_code}`,
          message: `${toFac.facility_name} yêu cầu chuyển ${dto.units_requested || 1} đơn vị máu ${transfer.blood_type?.blood_type_code || ''} từ cơ sở của bạn. Vui lòng kiểm tra và duyệt.`,
          notification_type: NotificationType.INFO,
          reference_type: 'TRANSFER',
          reference_id: transfer.transfer_id,
        });
      }
    } catch (e) {
      this.logger.warn('Failed to send notifications for transfer', e);
    }

    return { data: transfer, message: 'Đã tạo phiếu yêu cầu chuyển máu thành công. Chờ cơ sở xuất duyệt.' };
  }

  /**
   * 2. Duyệt phiếu chuyển máu (PENDING → APPROVED)
   * Cơ sở có máu duyệt, chọn túi máu cụ thể để chuyển
   */
  async approveTransfer(transferId: number, user: any, inventoryIds?: number[]) {
    // B1: Tìm phiếu chuyển và chỉ cho phép duyệt khi đang ở trạng thái PENDING
    const transfer = await this.prisma.blood_transfers.findUnique({
      where: { transfer_id: transferId },
      include: { from_facility: true, to_facility: true },
    });

    if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
    if (transfer.status !== 'PENDING') {
      throw new BadRequestException(`Phiếu đang ở trạng thái ${transfer.status}, không thể duyệt`);
    }

    return await this.prisma.$transaction(async (tx) => {
      // B2: Ưu tiên danh sách túi máu truyền vào; nếu rỗng thì dùng túi mặc định đã gắn sẵn trên phiếu
      let finalIds = inventoryIds || [];
      if (finalIds.length === 0 && transfer.inventory_id) {
        finalIds = [transfer.inventory_id];
      }

      const bagsToStore = [];

      // B3: Kiểm tra từng túi thuộc đúng cơ sở xuất, còn AVAILABLE rồi khóa sang ALLOCATED
      if (finalIds.length > 0) {
        for (const invId of finalIds) {
          const inv = await tx.blood_inventory.findUnique({
            where: { inventory_id: invId },
          });
          if (!inv) throw new BadRequestException(`Túi máu ID ${invId} không tồn tại`);
          if (inv.facility_id !== transfer.from_facility_id) {
            throw new BadRequestException(`Túi máu ID ${invId} không thuộc cơ sở xuất`);
          }
          if (inv.status_code !== 'AVAILABLE') {
            throw new BadRequestException(`Túi máu ID ${invId} đang ở trạng thái ${inv.status_code}, không thể chuyển`);
          }

          // Lock the inventory bag
          await tx.blood_inventory.update({
            where: { inventory_id: invId },
            data: { status_code: 'ALLOCATED' },
          });

          bagsToStore.push({ id: inv.inventory_id, code: inv.bag_code, volume: inv.volume_ml });
        }
      }

      // B4: Cập nhật phiếu sang APPROVED và lưu snapshot JSON các túi máu đã chọn
      const updated = await tx.blood_transfers.update({
        where: { transfer_id: transferId },
        data: {
          status: 'APPROVED',
          approved_by: user.user_id,
          approved_at: new Date(),
          inventory_id: finalIds[0] || null, // Keep the first one for backward compatibility
          inventory_ids: JSON.stringify(bagsToStore),
          updated_at: new Date(),
        },
        include: {
          from_facility: true,
          to_facility: true,
          blood_type: true,
          component: true,
          inventory: true,
        },
      });

      return { data: updated, message: 'Đã duyệt phiếu chuyển máu. Tiến hành xuất kho.' };
    });
  }

  /**
   * 3. Xuất kho - Đang vận chuyển (APPROVED → IN_TRANSIT)
   * Cơ sở xuất đóng gói, túi máu chuyển trạng thái reserved
   */
  async shipTransfer(transferId: number, user: any) {
    return await this.prisma.$transaction(async (tx) => {
      // B1: Kiểm tra phiếu tồn tại và đã được duyệt (APPROVED) trước khi xuất kho
      const transfer = await tx.blood_transfers.findUnique({
        where: { transfer_id: transferId },
        include: { inventory: true },
      });

      if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
      if (transfer.status !== 'APPROVED') {
        throw new BadRequestException(`Phiếu đang ở trạng thái ${transfer.status}, cần duyệt trước khi xuất kho`);
      }

      // B2: Trích xuất danh sách ID túi máu từ JSON inventory_ids (fallback về inventory_id đơn lẻ)
      let finalIds: number[] = [];
      if (transfer.inventory_ids) {
        try {
          const parsed = JSON.parse(transfer.inventory_ids);
          finalIds = parsed.map((x: any) => typeof x === 'object' ? x.id : x);
        } catch (e) {}
      }
      if (finalIds.length === 0 && transfer.inventory_id) {
        finalIds = [transfer.inventory_id];
      }

      if (finalIds.length === 0) {
        throw new BadRequestException('Chưa chọn túi máu cụ thể cho phiếu chuyển này');
      }

      // B3: Đảm bảo mỗi túi ở trạng thái ALLOCATED và tạo giao dịch xuất kho OUT
      for (const invId of finalIds) {
        await tx.blood_inventory.update({
          where: { inventory_id: invId },
          data: { status_code: 'ALLOCATED' }, // Ensure ALLOCATED
        });

        await tx.inventory_transactions.create({
          data: {
            inventory_id: invId,
            transaction_type: 'OUT',
            quantity: 1,
            reference_type: 'TRANSFER',
            reference_id: transfer.transfer_id,
            performed_by: user.user_id,
            notes: `Xuất kho chuyển máu: ${transfer.transfer_code}`,
          },
        });
      }

      // B4: Chuyển trạng thái phiếu sang IN_TRANSIT và ghi nhận thời điểm xuất kho
      const updated = await tx.blood_transfers.update({
        where: { transfer_id: transferId },
        data: {
          status: 'IN_TRANSIT',
          shipped_at: new Date(),
          updated_at: new Date(),
        },
        include: {
          from_facility: true,
          to_facility: true,
          blood_type: true,
          component: true,
          inventory: true,
        },
      });

      return { data: updated, message: 'Đã xuất kho. Túi máu đang được vận chuyển.' };
    });
  }

  /**
   * Đã giao (IN_TRANSIT -> DELIVERED)
   */
  async deliverTransfer(transferId: number, user: any) {
    return await this.prisma.$transaction(async (tx) => {
      // Kiểm tra phiếu đang ở trạng thái IN_TRANSIT rồi mới đánh dấu DELIVERED
      const transfer = await tx.blood_transfers.findUnique({
        where: { transfer_id: transferId },
      });

      if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
      if (transfer.status !== 'IN_TRANSIT') {
        throw new BadRequestException(`Phiếu đang ở trạng thái ${transfer.status}, chưa được vận chuyển`);
      }

      // Check permission if needed... usually Sender or Admin

      const updated = await tx.blood_transfers.update({
        where: { transfer_id: transferId },
        data: {
          status: 'DELIVERED',
          updated_at: new Date(),
        },
        include: {
          from_facility: true,
          to_facility: true,
          blood_type: true,
          component: true,
          inventory: true,
        },
      });

      return { data: updated, message: 'Đã xác nhận giao hàng. Chờ cơ sở nhận xác nhận.' };
    });
  }

  /**
   * 4. Nhận kho (DELIVERED → RECEIVED)
   * Cơ sở nhận xác nhận đã nhận máu, inventory chuyển sang cơ sở mới
   */
  async receiveTransfer(transferId: number, user: any) {
    return await this.prisma.$transaction(async (tx) => {
      // B1: Cho phép nhận kho khi phiếu đang ở IN_TRANSIT hoặc DELIVERED
      const transfer = await tx.blood_transfers.findUnique({
        where: { transfer_id: transferId },
        include: { inventory: true },
      });

      if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
      if (transfer.status !== 'DELIVERED' && transfer.status !== 'IN_TRANSIT') {
        throw new BadRequestException(`Phiếu đang ở trạng thái ${transfer.status}, chưa được giao đến`);
      }

      // B2: Lấy danh sách ID túi máu thuộc phiếu để chuyển quyền sở hữu kho
      let finalIds: number[] = [];
      if (transfer.inventory_ids) {
        try {
          const parsed = JSON.parse(transfer.inventory_ids);
          finalIds = parsed.map((x: any) => typeof x === 'object' ? x.id : x);
        } catch (e) {}
      }
      if (finalIds.length === 0 && transfer.inventory_id) {
        finalIds = [transfer.inventory_id];
      }

      if (finalIds.length === 0) {
        throw new BadRequestException('Phiếu chuyển không có túi máu');
      }

      // B3: Cập nhật facility_id của từng túi sang cơ sở nhận, mở về AVAILABLE và ghi giao dịch nhập kho IN
      for (const invId of finalIds) {
        // Move inventory to new facility, set back to AVAILABLE
        await tx.blood_inventory.update({
          where: { inventory_id: invId },
          data: {
            facility_id: transfer.to_facility_id,
            status_code: 'AVAILABLE',
          },
        });

        // Log transaction
        await tx.inventory_transactions.create({
          data: {
            inventory_id: invId,
            transaction_type: 'IN',
            quantity: 1,
            reference_type: 'TRANSFER',
            reference_id: transfer.transfer_id,
            performed_by: user.user_id,
            notes: `Nhận kho chuyển máu: ${transfer.transfer_code}`,
          },
        });
      }

      // B4: Chốt trạng thái phiếu sang RECEIVED và ghi thời điểm received_at
      const updated = await tx.blood_transfers.update({
        where: { transfer_id: transferId },
        data: {
          status: 'RECEIVED',
          received_at: new Date(),
          updated_at: new Date(),
        },
        include: {
          from_facility: true,
          to_facility: true,
          blood_type: true,
          component: true,
          inventory: true,
        },
      });

      return { data: updated, message: 'Đã xác nhận nhận kho thành công!' };
    });
  }

  /**
   * 4b. Nhận kho hàng loạt (DELIVERED → RECEIVED)
   * Xác nhận nhiều phiếu chuyển máu cùng lúc
   */
  async receiveBatchTransfers(transferIds: number[], user: any) {
    if (!Array.isArray(transferIds) || transferIds.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một phiếu chuyển máu để xác nhận');
    }

    // Tuần tự gọi receiveTransfer cho từng phiếu để đảm bảo mỗi phiếu giữ trọn giao dịch riêng
    const results = [];
    for (const id of transferIds) {
      const res = await this.receiveTransfer(Number(id), user);
      results.push(res.data);
    }

    return {
      data: results,
      message: `Đã xác nhận nhận kho thành công ${results.length} phiếu chuyển máu!`,
    };
  }

  /**
   * 5. Từ chối phiếu chuyển (PENDING → REJECTED)
   */
  async rejectTransfer(transferId: number, user: any, rejectReason: string) {
    // B1: Kiểm tra phiếu còn ở PENDING hoặc APPROVED mới được phép từ chối
    const transfer = await this.prisma.blood_transfers.findUnique({
      where: { transfer_id: transferId },
    });

    if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
    if (transfer.status !== 'PENDING' && transfer.status !== 'APPROVED') {
      throw new BadRequestException(`Phiếu đang ở trạng thái ${transfer.status}, không thể từ chối`);
    }

    // B2: Nếu trước đó đã duyệt giữ túi máu thì giải phóng toàn bộ về lại AVAILABLE
    // Nếu phiếu đã duyệt và đã giữ túi máu, trả túi về kho
    if (transfer.status === 'APPROVED') {
      let finalIds: number[] = [];
      if (transfer.inventory_ids) {
        try {
          const parsed = JSON.parse(transfer.inventory_ids);
          finalIds = parsed.map((x: any) => (typeof x === 'object' ? x.id : x));
        } catch (e) {}
      }
      if (finalIds.length === 0 && transfer.inventory_id) {
        finalIds = [transfer.inventory_id];
      }
      for (const invId of finalIds) {
        await this.prisma.blood_inventory.update({
          where: { inventory_id: invId },
          data: { status_code: 'AVAILABLE' },
        });
      }
    }

    // B3: Cập nhật trạng thái REJECTED kèm lý do từ chối
    const updated = await this.prisma.blood_transfers.update({
      where: { transfer_id: transferId },
      data: {
        status: 'REJECTED',
        reject_reason: rejectReason || 'Không có lý do',
        updated_at: new Date(),
      },
      include: {
        from_facility: true,
        to_facility: true,
        blood_type: true,
        component: true,
      },
    });

    return { data: updated, message: 'Đã từ chối phiếu chuyển máu.' };
  }

  /**
   * 6. Hủy phiếu chuyển (PENDING/APPROVED → CANCELLED)
   */
  async cancelTransfer(transferId: number, user: any) {
    return await this.prisma.$transaction(async (tx) => {
      // B1: Chỉ cho phép hủy khi phiếu chưa bước vào vận chuyển (PENDING hoặc APPROVED)
      const transfer = await tx.blood_transfers.findUnique({
        where: { transfer_id: transferId },
      });

      if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
      if (!['PENDING', 'APPROVED'].includes(transfer.status)) {
        throw new BadRequestException(`Phiếu đang ở trạng thái ${transfer.status}, không thể hủy`);
      }

      // B2: Nếu phiếu đã duyệt giữ túi máu, kiểm tra trạng thái ALLOCATED và mở về AVAILABLE
      // If inventory was allocated during approval, release it
      if (transfer.status === 'APPROVED') {
        let finalIds: number[] = [];
        if (transfer.inventory_ids) {
          try {
            const parsed = JSON.parse(transfer.inventory_ids);
            finalIds = parsed.map((x: any) => typeof x === 'object' ? x.id : x);
          } catch (e) {}
        }
        if (finalIds.length === 0 && transfer.inventory_id) {
          finalIds = [transfer.inventory_id];
        }

        for (const invId of finalIds) {
          const inv = await tx.blood_inventory.findUnique({
            where: { inventory_id: invId },
          });
          if (inv && inv.status_code === 'ALLOCATED') {
            await tx.blood_inventory.update({
              where: { inventory_id: invId },
              data: { status_code: 'AVAILABLE' },
            });
          }
        }
      }

      // B3: Đánh dấu phiếu chuyển sang CANCELLED
      const updated = await tx.blood_transfers.update({
        where: { transfer_id: transferId },
        data: {
          status: 'CANCELLED',
          updated_at: new Date(),
        },
        include: {
          from_facility: true,
          to_facility: true,
          blood_type: true,
          component: true,
        },
      });

      return { data: updated, message: 'Đã hủy phiếu chuyển máu.' };
    });
  }

  /**
   * 7. Lấy danh sách phiếu chuyển máu
   */
  async getTransfers(query: any, user: any) {
    // B1: Thiết lập phân trang và điều kiện lọc mặc định
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // B2: Giới hạn HOSPITAL_STAFF chỉ xem được các phiếu có cơ sở mình là bên xuất hoặc bên nhận
    // Staff can only see transfers related to their facility
    if (user?.role_code === 'HOSPITAL_STAFF' && user?.facility_id) {
      where.OR = [
        { from_facility_id: user.facility_id },
        { to_facility_id: user.facility_id },
      ];
    }

    // B3: Áp dụng các bộ lọc trạng thái, cơ sở xuất/nhận và mã phiếu
    if (query.status) where.status = query.status;
    if (query.from_facility_id) where.from_facility_id = Number(query.from_facility_id);
    if (query.to_facility_id) where.to_facility_id = Number(query.to_facility_id);
    if (query.search) {
      where.transfer_code = { contains: query.search };
    }

    // B4: Truy vấn song song dữ liệu phân trang và tổng số bản ghi
    const [data, total] = await Promise.all([
      this.prisma.blood_transfers.findMany({
        where,
        include: {
          from_facility: true,
          to_facility: true,
          blood_type: true,
          component: true,
          inventory: true,
          requester: { select: { user_id: true, full_name: true, email: true } },
          approver: { select: { user_id: true, full_name: true, email: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blood_transfers.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * 8. Lấy chi tiết phiếu chuyển
   */
  async getTransferById(id: number) {
    const transfer = await this.prisma.blood_transfers.findUnique({
      where: { transfer_id: id },
      include: {
        from_facility: true,
        to_facility: true,
        blood_type: true,
        component: true,
        inventory: true,
        requester: { select: { user_id: true, full_name: true, email: true } },
        approver: { select: { user_id: true, full_name: true, email: true } },
      },
    });

    if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
    return { data: transfer };
  }

  /**
   * Cron job chạy mỗi phút để quét các phiếu yêu cầu máu đã quá hạn (required_before < now).
   * Nếu trạng thái vẫn là PENDING hoặc APPROVED (chưa được IN_TRANSIT, DELIVERED, RECEIVED),
   * thì sẽ tự động chuyển sang CANCELLED.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredTransfers() {
    try {
      // Tìm tất cả phiếu PENDING hoặc APPROVED đã quá hạn required_before so với hiện tại
      const expiredTransfers = await this.prisma.blood_transfers.findMany({
        where: {
          required_before: {
            lt: new Date(),
          },
          status: {
            in: ['PENDING', 'APPROVED'],
          },
        },
      });

      // Hủy hàng loạt các phiếu quá hạn tìm được và ghi rõ lý do tự động đóng
      if (expiredTransfers.length > 0) {
        const ids = expiredTransfers.map(t => t.transfer_id);
        
        await this.prisma.blood_transfers.updateMany({
          where: { transfer_id: { in: ids } },
          data: {
            status: 'CANCELLED',
            reject_reason: 'Hệ thống tự động hủy do quá hạn thời gian yêu cầu',
            updated_at: new Date(),
          },
        });

        this.logger.log(`[Cron] Đã hủy ${ids.length} phiếu yêu cầu máu quá hạn.`);
      }
    } catch (error) {
      this.logger.error('[Cron] Lỗi khi quét phiếu quá hạn', error);
    }
  }

}

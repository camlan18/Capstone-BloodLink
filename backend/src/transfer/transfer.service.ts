import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

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
    if (dto.from_facility_id === dto.to_facility_id) {
      throw new BadRequestException('Cơ sở xuất và cơ sở nhận không được trùng nhau');
    }

    // Verify both facilities exist
    const [fromFac, toFac] = await Promise.all([
      this.prisma.medical_facilities.findUnique({ where: { facility_id: dto.from_facility_id } }),
      this.prisma.medical_facilities.findUnique({ where: { facility_id: dto.to_facility_id } }),
    ]);

    if (!fromFac) throw new BadRequestException('Cơ sở xuất không tồn tại');
    if (!toFac) throw new BadRequestException('Cơ sở nhận không tồn tại');

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
        requested_by: user.user_id,
      },
      include: {
        from_facility: true,
        to_facility: true,
        blood_type: true,
        component: true,
      },
    });

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
    const transfer = await this.prisma.blood_transfers.findUnique({
      where: { transfer_id: transferId },
      include: { from_facility: true, to_facility: true },
    });

    if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
    if (transfer.status !== 'PENDING') {
      throw new BadRequestException(`Phiếu đang ở trạng thái ${transfer.status}, không thể duyệt`);
    }

    return await this.prisma.$transaction(async (tx) => {
      let finalIds = inventoryIds || [];
      if (finalIds.length === 0 && transfer.inventory_id) {
        finalIds = [transfer.inventory_id];
      }

      const bagsToStore = [];

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
      const transfer = await tx.blood_transfers.findUnique({
        where: { transfer_id: transferId },
        include: { inventory: true },
      });

      if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
      if (transfer.status !== 'APPROVED') {
        throw new BadRequestException(`Phiếu đang ở trạng thái ${transfer.status}, cần duyệt trước khi xuất kho`);
      }

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
   * 4. Nhận kho (IN_TRANSIT → RECEIVED)
   * Cơ sở nhận xác nhận đã nhận máu, inventory chuyển sang cơ sở mới
   */
  async receiveTransfer(transferId: number, user: any) {
    return await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.blood_transfers.findUnique({
        where: { transfer_id: transferId },
        include: { inventory: true },
      });

      if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
      if (transfer.status !== 'IN_TRANSIT') {
        throw new BadRequestException(`Phiếu đang ở trạng thái ${transfer.status}, chưa được xuất kho`);
      }

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
   * 5. Từ chối phiếu chuyển (PENDING → REJECTED)
   */
  async rejectTransfer(transferId: number, user: any, rejectReason: string) {
    const transfer = await this.prisma.blood_transfers.findUnique({
      where: { transfer_id: transferId },
    });

    if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
    if (transfer.status !== 'PENDING' && transfer.status !== 'APPROVED') {
      throw new BadRequestException(`Phiếu đang ở trạng thái ${transfer.status}, không thể từ chối`);
    }

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
      const transfer = await tx.blood_transfers.findUnique({
        where: { transfer_id: transferId },
      });

      if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
      if (!['PENDING', 'APPROVED'].includes(transfer.status)) {
        throw new BadRequestException(`Phiếu đang ở trạng thái ${transfer.status}, không thể hủy`);
      }

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
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Staff can only see transfers related to their facility
    if (user?.role_code === 'HOSPITAL_STAFF' && user?.facility_id) {
      where.OR = [
        { from_facility_id: user.facility_id },
        { to_facility_id: user.facility_id },
      ];
    }

    if (query.status) where.status = query.status;
    if (query.from_facility_id) where.from_facility_id = Number(query.from_facility_id);
    if (query.to_facility_id) where.to_facility_id = Number(query.to_facility_id);
    if (query.search) {
      where.transfer_code = { contains: query.search };
    }

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
}

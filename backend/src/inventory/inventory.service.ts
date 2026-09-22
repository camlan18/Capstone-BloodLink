import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ExcelUtil } from '../common/utils/excel.util';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) { }

  async receiveBlood(dto: any, user: any) {
    const facility_id = user.role_code === 'HOSPITAL_STAFF' ? user.facility_id : dto.facility_id;
    if (!facility_id) throw new BadRequestException('Cơ sở y tế không được để trống');

    const existing = await this.prisma.blood_inventory.findUnique({
      where: { bag_code: dto.bag_code },
    });
    if (existing) {
      throw new BadRequestException('Mã túi máu (bag_code) đã tồn tại trong hệ thống.');
    }

    return await this.prisma.$transaction(async (tx) => {
      const inventory = await tx.blood_inventory.create({
        data: {
          facility_id: facility_id,
          blood_type_id: dto.blood_type_id,
          component_id: dto.component_id,
          bag_code: dto.bag_code,
          volume_ml: dto.volume_ml,
          collection_date: dto.collection_date,
          expiry_date: dto.expiry_date,
          status_code: 'AVAILABLE',
          source_donation_id: dto.source_donation_id,
          notes: dto.notes,
        },
      });

      await tx.inventory_transactions.create({
        data: {
          inventory_id: inventory.inventory_id,
          transaction_type: 'IN',
          quantity: 1,
          reference_type: 'DONATION',
          reference_id: dto.source_donation_id,
          performed_by: dto.staff_user_id,
          notes: 'Nhập kho máu mới',
        },
      });

      return inventory;
    });
  }

  async updateBlood(inventoryId: number, dto: any, user: any) {
    const inventory = await this.prisma.blood_inventory.findUnique({
      where: { inventory_id: inventoryId },
    });

    if (!inventory) {
      throw new NotFoundException('Không tìm thấy túi máu');
    }

    if (user.role_code === 'HOSPITAL_STAFF' && inventory.facility_id !== user.facility_id) {
      throw new BadRequestException('Bạn không có quyền sửa túi máu của cơ sở khác');
    }

    return await this.prisma.blood_inventory.update({
      where: { inventory_id: inventoryId },
      data: {
        facility_id: user.role_code === 'HOSPITAL_STAFF' ? undefined : (dto.facility_id !== undefined ? dto.facility_id : undefined),
        blood_type_id: dto.blood_type_id !== undefined ? dto.blood_type_id : undefined,
        component_id: dto.component_id !== undefined ? dto.component_id : undefined,
        bag_code: dto.bag_code !== undefined ? dto.bag_code : undefined,
        volume_ml: dto.volume_ml !== undefined ? dto.volume_ml : undefined,
        collection_date: dto.collection_date !== undefined ? dto.collection_date : undefined,
        expiry_date: dto.expiry_date !== undefined ? dto.expiry_date : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
      },
    });
  }

  /**
   * Tiêu hủy túi máu (Lỗi / Hết hạn)
   */
  async discardBlood(inventoryId: number, user: any, reason: string) {
    return await this.prisma.$transaction(async (tx) => {
      const inventory = await tx.blood_inventory.findUnique({
        where: { inventory_id: inventoryId },
      });

      if (!inventory) {
        throw new NotFoundException('Không tìm thấy túi máu');
      }

      if (user.role_code === 'HOSPITAL_STAFF' && inventory.facility_id !== user.facility_id) {
        throw new BadRequestException('Bạn không có quyền tiêu hủy túi máu của cơ sở khác');
      }

      if (inventory.status_code !== 'AVAILABLE' && inventory.status_code !== 'EXPIRED') {
        throw new BadRequestException(`Túi máu đang ở trạng thái ${inventory.status_code}, không thể tiêu hủy.`);
      }

      // 1. Update status
      const updated = await tx.blood_inventory.update({
        where: { inventory_id: inventoryId },
        data: { status_code: 'DISCARDED' },
      });

      // 2. Ghi log transaction
      await tx.inventory_transactions.create({
        data: {
          inventory_id: inventoryId,
          transaction_type: 'OUT',
          quantity: 1,
          reference_type: 'DISCARD',
          performed_by: user.user_id,
          notes: reason,
        },
      });

      return updated;
    });
  }

  /**
   * B10: Chuyển máu giữa cơ sở
   */
  async transferBlood(inventoryId: number, toFacilityId: number, user: any, notes: string) {
    return await this.prisma.$transaction(async (tx) => {
      const inventory = await tx.blood_inventory.findUnique({
        where: { inventory_id: inventoryId },
      });

      if (!inventory) {
        throw new NotFoundException('Không tìm thấy túi máu');
      }

      if (user.role_code === 'HOSPITAL_STAFF' && inventory.facility_id !== user.facility_id) {
        throw new BadRequestException('Bạn không có quyền chuyển túi máu của cơ sở khác');
      }

      if (inventory.status_code !== 'AVAILABLE') {
        throw new BadRequestException(`Túi máu đang ở trạng thái ${inventory.status_code}, không thể chuyển.`);
      }

      if (inventory.facility_id === toFacilityId) {
        throw new BadRequestException('Cơ sở đích trùng với cơ sở hiện tại');
      }

      const updated = await tx.blood_inventory.update({
        where: { inventory_id: inventoryId },
        data: { facility_id: toFacilityId },
      });

      await tx.inventory_transactions.create({
        data: {
          inventory_id: inventoryId,
          transaction_type: 'TRANSFER',
          quantity: 1,
          reference_type: 'FACILITY',
          reference_id: toFacilityId,
          performed_by: user.user_id,
          notes: notes || 'Chuyển máu giữa các cơ sở',
        },
      });

      return updated;
    });
  }

  /**
   * Thống kê kho máu (Group By Facility, Blood Type, Component)
   */
  async getInventoryStats(user: any) {
    const where: any = { status_code: 'AVAILABLE' };
    if (user.role_code === 'HOSPITAL_STAFF') {
      where.facility_id = user.facility_id || -1;
    }

    const stats = await this.prisma.blood_inventory.groupBy({
      by: ['facility_id', 'blood_type_id', 'component_id'],
      where,
      _count: {
        inventory_id: true,
      },
      _sum: {
        volume_ml: true,
      },
    });

    return stats;
  }

  async getInventoryList(query: any, user: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (user.role_code === 'HOSPITAL_STAFF') {
      where.facility_id = user.facility_id || -1;
    } else if (query.facility_id) {
      where.facility_id = Number(query.facility_id);
    }
    if (query.status_code) where.status_code = query.status_code;
    if (query.blood_type_id) where.blood_type_id = Number(query.blood_type_id);
    if (query.bag_code) where.bag_code = { contains: query.bag_code };

    const [data, total] = await Promise.all([
      this.prisma.blood_inventory.findMany({
        where,
        include: {
          facility: true,
          blood_type: true,
          component: true
        },
        orderBy: { expiry_date: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.blood_inventory.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // --- EXCEL FEATURE ---

  async exportExcel(query: any, user: any): Promise<Buffer> {
    const list = await this.getInventoryList({ ...query, limit: 10000 }, user);
    const data = list.data.map((item: any) => ({
      'Mã túi máu': item.bag_code,
      'Nhóm máu': item.blood_type?.blood_type_code || '',
      'Thành phần': item.component?.component_name || '',
      'Thể tích (ml)': item.volume_ml,
      'Cơ sở thu nhận': item.facility?.facility_name || '',
      'Ngày lấy': new Date(item.collection_date).toLocaleDateString('vi-VN'),
      'Ngày hết hạn': new Date(item.expiry_date).toLocaleDateString('vi-VN'),
      'Trạng thái': item.status_code
    }));
    return ExcelUtil.generateExcel(data, 'KhoMau');
  }

  async getTemplate(): Promise<Buffer> {
    const headers = [
      'Mã cơ sở (ID)',
      'Mã nhóm máu (ID)',
      'Mã thành phần (ID)',
      'Mã túi máu',
      'Thể tích (ml)',
      'Ngày lấy (YYYY-MM-DD)',
      'Ngày hết hạn (YYYY-MM-DD)'
    ];
    return ExcelUtil.generateTemplate(headers, 'Template_KhoMau');
  }

  async importExcel(buffer: Buffer, staffId: number) {
    const data = ExcelUtil.parseExcel(buffer);
    let success = 0;
    let failed = 0;

    for (const row of data) {
      try {
        const user = await this.prisma.users.findUnique({ where: { user_id: staffId }, include: { role: true } });
        let facilityId = Number(row['Mã cơ sở (ID)']);
        if (user?.role?.role_code === 'HOSPITAL_STAFF') {
          facilityId = user.facility_id || -1;
        }
        const bloodTypeId = Number(row['Mã nhóm máu (ID)']);
        const componentId = Number(row['Mã thành phần (ID)']);
        const bagCode = row['Mã túi máu'];
        const volume = Number(row['Thể tích (ml)']);
        const collDate = new Date(row['Ngày lấy (YYYY-MM-DD)']);
        const expDate = new Date(row['Ngày hết hạn (YYYY-MM-DD)']);

        if (!facilityId || !bloodTypeId || !componentId || !bagCode || !volume) {
          failed++;
          continue;
        }

        // Check exist
        const exist = await this.prisma.blood_inventory.findUnique({
          where: { bag_code: bagCode }
        });

        if (exist) {
          failed++; // Skip or update. Here we skip existing.
          continue;
        }

        const newInv = await this.prisma.blood_inventory.create({
          data: {
            facility_id: facilityId,
            blood_type_id: bloodTypeId,
            component_id: componentId,
            bag_code: bagCode,
            volume_ml: volume,
            collection_date: collDate,
            expiry_date: expDate,
            status_code: 'AVAILABLE'
          }
        });

        await this.prisma.inventory_transactions.create({
          data: {
            inventory_id: newInv.inventory_id,
            transaction_type: 'IN',
            quantity: 1,
            performed_by: staffId,
            notes: 'Nhập kho từ file Excel'
          }
        });

        success++;
      } catch (err) {
        failed++;
      }
    }

    return { message: `Import hoàn tất. Thành công: ${success}, Thất bại/Bỏ qua: ${failed}` };
  }

  // --- CRON JOB: Tự động đánh dấu túi máu hết hạn ---
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronExpireInventory() {
    this.logger.log('Kiểm tra túi máu hết hạn...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const expiredBags = await this.prisma.blood_inventory.findMany({
        where: {
          expiry_date: { lt: today },
          status_code: 'AVAILABLE'
        }
      });

      if (expiredBags.length === 0) {
        this.logger.log('Không có túi máu nào hết hạn.');
        return;
      }

      for (const bag of expiredBags) {
        await this.prisma.blood_inventory.update({
          where: { inventory_id: bag.inventory_id },
          data: { status_code: 'EXPIRED' }
        });

        await this.prisma.inventory_transactions.create({
          data: {
            inventory_id: bag.inventory_id,
            transaction_type: 'EXPIRE',
            quantity: 1,
            reference_type: 'SYSTEM_CRON',
            notes: `Tự động đánh dấu hết hạn (expiry: ${bag.expiry_date.toISOString().split('T')[0]})`
          }
        });
      }

      this.logger.log(`Đã đánh dấu ${expiredBags.length} túi máu hết hạn.`);

      // Thông báo admin nếu có nhiều túi hết hạn
      if (expiredBags.length >= 1) {
        await this.notificationsService.notifyAdmins(
          'Cảnh báo: Túi máu hết hạn',
          `Hệ thống vừa tự động đánh dấu ${expiredBags.length} túi máu đã hết hạn sử dụng. Vui lòng kiểm tra và xử lý tiêu hủy.`,
          NotificationType.WARNING,
          'INVENTORY'
        );
      }
    } catch (error) {
      this.logger.error('Lỗi khi chạy cron expire inventory', error);
    }
  }
}

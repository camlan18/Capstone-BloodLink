import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExcelUtil } from '../common/utils/excel.util';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) { }


  async receiveBlood(dto: {
    facility_id: number;
    blood_type_id: number;
    component_id: number;
    bag_code: string;
    volume_ml: number;
    collection_date: Date;
    expiry_date: Date;
    source_donation_id?: number;
    notes?: string;
    staff_user_id: number;
  }) {
    const existing = await this.prisma.blood_inventory.findUnique({
      where: { bag_code: dto.bag_code },
    });
    if (existing) {
      throw new BadRequestException('Mã túi máu (bag_code) đã tồn tại trong hệ thống.');
    }

    return await this.prisma.$transaction(async (tx) => {
      const inventory = await tx.blood_inventory.create({
        data: {
          facility_id: dto.facility_id,
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

  async updateBlood(inventoryId: number, dto: any, staffId: number) {
    const inventory = await this.prisma.blood_inventory.findUnique({
      where: { inventory_id: inventoryId },
    });

    if (!inventory) {
      throw new NotFoundException('Không tìm thấy túi máu');
    }

    return await this.prisma.blood_inventory.update({
      where: { inventory_id: inventoryId },
      data: {
        facility_id: dto.facility_id !== undefined ? dto.facility_id : undefined,
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
  async discardBlood(inventoryId: number, staffId: number, reason: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Dùng pessimistic/optimistic lock không trực tiếp hỗ trợ native trong Prisma `$transaction(async)` 
      // nhưng việc đọc và check status trong 1 block Isolation Level cao có thể đảm bảo an toàn.
      const inventory = await tx.blood_inventory.findUnique({
        where: { inventory_id: inventoryId },
      });

      if (!inventory) {
        throw new NotFoundException('Không tìm thấy túi máu');
      }

      if (inventory.status_code !== 'AVAILABLE') {
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
          performed_by: staffId,
          notes: reason,
        },
      });

      return updated;
    });
  }

  /**
   * Thống kê kho máu (Group By Facility, Blood Type, Component)
   */
  async getInventoryStats() {
    const stats = await this.prisma.blood_inventory.groupBy({
      by: ['facility_id', 'blood_type_id', 'component_id'],
      where: {
        status_code: 'AVAILABLE',
      },
      _count: {
        inventory_id: true,
      },
      _sum: {
        volume_ml: true,
      },
    });

    return stats;
  }

  async getInventoryList(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.facility_id) where.facility_id = Number(query.facility_id);
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

  async exportExcel(query: any): Promise<Buffer> {
    const list = await this.getInventoryList({ ...query, limit: 10000 });
    const data = list.data.map((item: any) => ({
      'Mã túi máu': item.bag_code,
      'Nhóm máu': item.blood_type?.blood_type_code || '',
      'Thành phần': item.component?.component_name || '',
      'Thể tích (ml)': item.volume_ml,
      'Cơ sở thu nhận': item.facility?.facility_name || '',
      'Ngày lấy': new Date(item.collection_date).toLocaleDateString('vi-VN'),
      'Ngày hết hạn': new Date(item.expiry_date).toLocaleDateString('vi-VN'),
      'Trạng thái': item.status
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
        const facilityId = Number(row['Mã cơ sở (ID)']);
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

        await this.prisma.blood_inventory.create({
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
        success++;
      } catch (err) {
        failed++;
      }
    }

    return { message: `Import hoàn tất. Thành công: ${success}, Thất bại/Bỏ qua: ${failed}` };
  }
}

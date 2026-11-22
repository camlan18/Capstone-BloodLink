import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSettingDto } from './dto/system-settings.dto';

/**
 * Service quản lý đọc, tạo/cập nhật và xóa các tham số cấu hình hệ thống.
 */
@Injectable()
export class SystemSettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lấy danh sách cấu hình hệ thống có phân trang và tìm kiếm theo khóa hoặc mô tả.
   */
  async getSettings(query: any) {
    // Khởi tạo phân trang và lọc từ khóa theo tên khóa cấu hình hoặc mô tả
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { setting_key: { contains: query.search } },
        { description: { contains: query.search } }
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.system_settings.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.system_settings.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Tạo mới hoặc cập nhật giá trị cấu hình theo `setting_key`.
   */
  async upsertSetting(dto: UpsertSettingDto) {
    // Kiểm tra setting_key đã tồn tại chưa để quyết định cập nhật hay tạo bản ghi mới
    const existing = await this.prisma.system_settings.findUnique({
      where: { setting_key: dto.setting_key }
    });

    if (existing) {
      return await this.prisma.system_settings.update({
        where: { setting_key: dto.setting_key },
        data: {
          setting_value: dto.setting_value,
          description: dto.description,
          updated_at: new Date()
        }
      });
    } else {
      return await this.prisma.system_settings.create({
        data: {
          setting_key: dto.setting_key,
          setting_value: dto.setting_value,
          description: dto.description,
          updated_at: new Date()
        }
      });
    }
  }

  /**
   * Xóa một cấu hình hệ thống theo ID sau khi kiểm tra tồn tại.
   */
  async deleteSetting(id: number) {
    const setting = await this.prisma.system_settings.findUnique({ where: { setting_id: id } });
    if (!setting) throw new NotFoundException('Không tìm thấy cấu hình này');
    
    return await this.prisma.system_settings.delete({ where: { setting_id: id } });
  }

  /**
   * Tra cứu giá trị chuỗi của một khóa cấu hình, trả về `defaultValue` nếu không tìm thấy.
   */
  async getSettingValue(key: string, defaultValue: string): Promise<string> {
    const setting = await this.prisma.system_settings.findUnique({
      where: { setting_key: key }
    });
    return setting ? setting.setting_value : defaultValue;
  }
}

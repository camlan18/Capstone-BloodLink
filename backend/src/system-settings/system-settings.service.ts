import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSettingDto } from './dto/system-settings.dto';

@Injectable()
export class SystemSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(query: any) {
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

  async upsertSetting(dto: UpsertSettingDto) {
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

  async deleteSetting(id: number) {
    const setting = await this.prisma.system_settings.findUnique({ where: { setting_id: id } });
    if (!setting) throw new NotFoundException('Không tìm thấy cấu hình này');
    
    return await this.prisma.system_settings.delete({ where: { setting_id: id } });
  }
}

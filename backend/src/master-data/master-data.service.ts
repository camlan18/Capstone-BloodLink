import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateBloodTypeDto, UpdateBloodTypeDto, 
  CreateFacilityDto, UpdateFacilityDto,
  CreateBloodComponentDto, UpdateBloodComponentDto,
  CreateBloodCompatibilityDto, UpdateBloodCompatibilityDto,
  CreateDonationIntervalRuleDto, UpdateDonationIntervalRuleDto
} from './dto/master-data.dto';
import { MasterDataFilterDto } from './dto/master-data-filter.dto';
import { ExcelUtil } from '../common/utils/excel.util';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getBloodComponents(query?: MasterDataFilterDto) {
    if (!query || Object.keys(query).length === 0) {
      // Return all active components without pagination for dropdowns if no query provided
      return await this.prisma.blood_components.findMany({
        where: { is_active: true },
        include: { interval_rules: true },
        orderBy: { component_id: 'asc' },
      });
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }
    if (query.search) {
      where.component_name = { contains: query.search };
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'asc';
    } else {
      orderBy.component_id = 'asc';
    }

    const [data, total] = await Promise.all([
      this.prisma.blood_components.findMany({ where, skip, take: limit, orderBy, include: { interval_rules: true } }),
      this.prisma.blood_components.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createBloodComponent(dto: CreateBloodComponentDto) {
    const exists = await this.prisma.blood_components.findFirst({
      where: { component_code: dto.component_code }
    });
    if (exists) throw new BadRequestException('Mã thành phần máu này đã tồn tại');

    return await this.prisma.blood_components.create({
      data: {
        component_code: dto.component_code,
        component_name: dto.component_name,
        description: dto.description,
      }
    });
  }

  async updateBloodComponent(id: number, dto: UpdateBloodComponentDto) {
    return await this.prisma.blood_components.update({
      where: { component_id: id },
      data: {
        component_code: dto.component_code,
        component_name: dto.component_name,
        description: dto.description,
        is_active: dto.is_active,
      }
    });
  }

  async deleteBloodComponent(id: number) {
    return await this.prisma.blood_components.update({
      where: { component_id: id },
      data: { is_active: false }
    });
  }

  async getUrgencyLevels() {
    return await this.prisma.urgency_levels.findMany({
      orderBy: { priority_level: 'asc' },
    });
  }

  async getBloodTypes(query: MasterDataFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }
    if (query.search) {
      where.abo = { contains: query.search };
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'asc';
    } else {
      orderBy.display_order = 'asc';
    }

    const [data, total] = await Promise.all([
      this.prisma.blood_types.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.blood_types.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getProvinces() {
    return await this.prisma.provinces.findMany({
      orderBy: { province_name: 'asc' },
    });
  }

  async getDistricts(provinceId: number) {
    return await this.prisma.districts.findMany({
      where: { province_id: provinceId },
      orderBy: { district_name: 'asc' },
    });
  }

  async getWards(districtId: number) {
    return await this.prisma.wards.findMany({
      where: { district_id: districtId },
      orderBy: { ward_name: 'asc' },
    });
  }

  async getFacilities(query: MasterDataFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }
    if (query.search) {
      where.OR = [
        { facility_name: { contains: query.search } },
        { address: { contains: query.search } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy.is_primary = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.medical_facilities.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.medical_facilities.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getRoles() {
    return await this.prisma.roles.findMany({
      where: { is_active: true },
    });
  }

  // --- ADMIN ROUTES ---

  async createBloodType(dto: CreateBloodTypeDto) {
    const exists = await this.prisma.blood_types.findFirst({
      where: { abo: dto.blood_group, rh_factor: dto.rh_factor }
    });
    if (exists) throw new BadRequestException('Nhóm máu này đã tồn tại');

    return await this.prisma.blood_types.create({
      data: {
        blood_type_code: `${dto.blood_group}${dto.rh_factor === '+' ? 'POS' : 'NEG'}`,
        abo: dto.blood_group,
        rh_factor: dto.rh_factor,
        display_order: dto.display_order || 0,
      }
    });
  }

  async updateBloodType(id: number, dto: UpdateBloodTypeDto) {
    return await this.prisma.blood_types.update({
      where: { blood_type_id: id },
      data: {
        ...(dto.blood_group ? { abo: dto.blood_group } : {}),
        rh_factor: dto.rh_factor,
        display_order: dto.display_order,
        is_active: dto.is_active,
      }
    });
  }

  async getFacilityById(id: number) {
    const facility = await this.prisma.medical_facilities.findUnique({
      where: { facility_id: id },
      include: { province: true, district: true, ward: true }
    });
    if (!facility) throw new NotFoundException('Cơ sở y tế không tồn tại');
    return facility;
  }

  async createFacility(dto: CreateFacilityDto) {
    const facilityCode = dto.facility_code || `FAC-${Date.now()}`;
    const exists = await this.prisma.medical_facilities.findUnique({ where: { facility_code: facilityCode } });
    if (exists) throw new BadRequestException('Mã cơ sở y tế đã tồn tại');

    if (dto.is_primary) {
      await this.prisma.medical_facilities.updateMany({
        where: { is_primary: true },
        data: { is_primary: false }
      });
    }

    return await this.prisma.medical_facilities.create({
      data: {
        ...dto,
        facility_code: facilityCode,
      }
    });
  }

  async updateFacility(id: number, dto: UpdateFacilityDto) {
    if (dto.is_primary) {
      await this.prisma.medical_facilities.updateMany({
        where: { 
          is_primary: true,
          facility_id: { not: id }
        },
        data: { is_primary: false }
      });
    }

    return await this.prisma.medical_facilities.update({
      where: { facility_id: id },
      data: dto
    });
  }

  async deleteFacility(id: number) {
    return await this.prisma.medical_facilities.update({
      where: { facility_id: id },
      data: { is_active: false }
    });
  }

  // --- EXCEL FACILITIES ---
  async exportFacilitiesExcel(query: any): Promise<Buffer> {
    const list = await this.getFacilities({ ...query, limit: 10000 });
    const data = list.data.map((item: any) => ({
      'Mã cơ sở': item.facility_code || '',
      'Tên cơ sở': item.facility_name || '',
      'Tên viết tắt': item.short_name || '',
      'Số điện thoại': item.phone || '',
      'Email': item.email || '',
      'Địa chỉ': item.address || '',
      'Website': item.website || '',
      'Cơ sở chính': item.is_primary ? 'Có' : 'Không',
      'Trạng thái': item.is_active ? 'Hoạt động' : 'Ngừng hoạt động'
    }));
    return ExcelUtil.generateExcel(data, 'CoSoYTe');
  }

  async getFacilitiesTemplate(): Promise<Buffer> {
    const headers = [
      'Mã cơ sở',
      'Tên cơ sở',
      'Tên viết tắt',
      'Số điện thoại',
      'Email',
      'Địa chỉ',
      'Website',
      'Cơ sở chính (1/0)'
    ];
    return ExcelUtil.generateTemplate(headers, 'Template_CoSoYTe');
  }

  async importFacilitiesExcel(buffer: Buffer) {
    const data = ExcelUtil.parseExcel(buffer);
    let success = 0;
    let failed = 0;

    for (const row of data) {
      try {
        const facilityName = row['Tên cơ sở'];
        const address = row['Địa chỉ'];

        if (!facilityName || !address) {
          failed++;
          continue;
        }

        const facilityCode = row['Mã cơ sở'] || `FAC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const isPrimary = row['Cơ sở chính (1/0)'] === '1' || row['Cơ sở chính (1/0)'] === 1;

        if (isPrimary) {
          await this.prisma.medical_facilities.updateMany({
            where: { is_primary: true },
            data: { is_primary: false }
          });
        }

        await this.prisma.medical_facilities.create({
          data: {
            facility_code: facilityCode.toString(),
            facility_name: facilityName.toString(),
            short_name: row['Tên viết tắt']?.toString(),
            address: address.toString(),
            phone: row['Số điện thoại']?.toString(),
            email: row['Email']?.toString(),
            website: row['Website']?.toString(),
            is_primary: isPrimary,
            is_active: true
          }
        });
        success++;
      } catch (err) {
        failed++;
      }
    }

    return { message: `Import hoàn tất. Thành công: ${success}, Thất bại/Bỏ qua: ${failed}` };
  }

  async deleteBloodType(id: number) {
    return await this.prisma.blood_types.update({
      where: { blood_type_id: id },
      data: { is_active: false }
    });
  }

  // --- Blood Compatibility ---
  async getBloodCompatibilities(query: MasterDataFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.is_active !== undefined) {
      where.is_compatible = query.is_active;
    }

    const [data, total] = await Promise.all([
      this.prisma.blood_compatibility.findMany({ 
        where, 
        skip, 
        take: limit, 
        include: { component: true, donor_blood_type: true, recipient_blood_type: true } 
      }),
      this.prisma.blood_compatibility.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createBloodCompatibility(dto: CreateBloodCompatibilityDto) {
    return await this.prisma.blood_compatibility.create({
      data: {
        component_id: dto.component_id,
        donor_blood_type_id: dto.donor_blood_type_id,
        recipient_blood_type_id: dto.recipient_blood_type_id,
        is_compatible: dto.is_compatible !== undefined ? dto.is_compatible : true,
        notes: dto.notes,
      }
    });
  }

  async updateBloodCompatibility(id: number, dto: UpdateBloodCompatibilityDto) {
    return await this.prisma.blood_compatibility.update({
      where: { compatibility_id: id },
      data: {
        component_id: dto.component_id,
        donor_blood_type_id: dto.donor_blood_type_id,
        recipient_blood_type_id: dto.recipient_blood_type_id,
        is_compatible: dto.is_compatible,
        notes: dto.notes,
      }
    });
  }

  async deleteBloodCompatibility(id: number) {
    return await this.prisma.blood_compatibility.delete({
      where: { compatibility_id: id }
    });
  }

  // --- Donation Interval Rules ---
  async getDonationIntervalRules(query: MasterDataFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }

    const [data, total] = await Promise.all([
      this.prisma.donation_interval_rules.findMany({ 
        where, 
        skip, 
        take: limit, 
        include: { component: true } 
      }),
      this.prisma.donation_interval_rules.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createDonationIntervalRule(dto: CreateDonationIntervalRuleDto) {
    return await this.prisma.donation_interval_rules.create({
      data: {
        component_id: dto.component_id,
        min_interval_days: dto.min_interval_days,
        max_donations_per_year: dto.max_donations_per_year,
        description: dto.description,
      }
    });
  }

  async updateDonationIntervalRule(id: number, dto: UpdateDonationIntervalRuleDto) {
    return await this.prisma.donation_interval_rules.update({
      where: { rule_id: id },
      data: {
        component_id: dto.component_id,
        min_interval_days: dto.min_interval_days,
        max_donations_per_year: dto.max_donations_per_year,
        description: dto.description,
        is_active: dto.is_active,
      }
    });
  }

  async deleteDonationIntervalRule(id: number) {
    return await this.prisma.donation_interval_rules.update({
      where: { rule_id: id },
      data: { is_active: false }
    });
  }
}

import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
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



  async getWards(provinceId: number) {
    return await this.prisma.wards.findMany({
      where: { province_id: provinceId },
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
      include: { province: true, ward: true }
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

  async getMyFacility(user: any) {
    let targetFacilityId = user.facility_id;
    if (!targetFacilityId) {
      const firstFacility = await this.prisma.medical_facilities.findFirst({
        where: { is_active: true },
        orderBy: [{ is_primary: 'desc' }, { facility_id: 'asc' }],
        include: { province: true, ward: true }
      });
      if (firstFacility) return firstFacility;
      throw new NotFoundException('Không tìm thấy cơ sở y tế');
    }
    const facility = await this.prisma.medical_facilities.findUnique({
      where: { facility_id: targetFacilityId },
      include: { province: true, ward: true }
    });
    if (!facility) {
      throw new NotFoundException('Không tìm thấy cơ sở y tế');
    }
    return facility;
  }

  async updateFacilitySealSignature(id: number, dto: any, user: any) {
    if (user.role_code === 'HOSPITAL_STAFF' && user.facility_id !== id) {
      throw new ForbiddenException('Bạn chỉ có quyền cập nhật con dấu và chữ ký của cơ sở y tế mình trực thuộc');
    }

    const facility = await this.prisma.medical_facilities.findUnique({
      where: { facility_id: id }
    });
    if (!facility) throw new NotFoundException('Không tìm thấy cơ sở y tế');

    return await this.prisma.medical_facilities.update({
      where: { facility_id: id },
      data: {
        seal_image_url: dto.seal_image_url !== undefined ? dto.seal_image_url : facility.seal_image_url,
        signature_image_url: dto.signature_image_url !== undefined ? dto.signature_image_url : facility.signature_image_url,
        director_name: dto.director_name !== undefined ? dto.director_name : facility.director_name,
        director_title: dto.director_title !== undefined ? dto.director_title : facility.director_title,
      }
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

  // B17: Blood Compatibility Checker
  async checkCompatibility(donorBloodTypeId: number, recipientBloodTypeId: number, componentId: number) {
    const compatibility = await this.prisma.blood_compatibility.findFirst({
      where: {
        donor_blood_type_id: donorBloodTypeId,
        recipient_blood_type_id: recipientBloodTypeId,
        component_id: componentId,
      }
    });

    if (compatibility) {
      return { is_compatible: compatibility.is_compatible };
    }

    // Default fallback rules if not explicitly mapped
    const donorType = await this.prisma.blood_types.findUnique({ where: { blood_type_id: donorBloodTypeId } });
    const recipientType = await this.prisma.blood_types.findUnique({ where: { blood_type_id: recipientBloodTypeId } });
    const component = await this.prisma.blood_components.findUnique({ where: { component_id: componentId } });

    if (!donorType || !recipientType || !component) {
      throw new BadRequestException('Thông tin nhóm máu hoặc thành phần máu không hợp lệ');
    }

    // Simple rule for Whole Blood / Red Blood Cells
    let isCompatible = false;
    
    // O is universal donor for RBC, AB is universal recipient
    // Rh- can donate to Rh+ and Rh-
    // Rh+ can only donate to Rh+
    const rhCompatible = donorType.rh_factor === '-' || donorType.rh_factor === recipientType.rh_factor;
    
    if (rhCompatible) {
      if (donorType.abo === 'O') isCompatible = true;
      else if (recipientType.abo === 'AB') isCompatible = true;
      else if (donorType.abo === recipientType.abo) isCompatible = true;
    }

    // Plasma/Platelets have different rules (AB is universal donor, O is universal recipient)
    if (component.component_code.includes('PLASMA') || component.component_code.includes('PLATELET')) {
       // Reverse rule for ABO
       isCompatible = false;
       if (donorType.abo === 'AB') isCompatible = true;
       else if (recipientType.abo === 'O') isCompatible = true;
       else if (donorType.abo === recipientType.abo) isCompatible = true;
       // Rh doesn't strictly matter for plasma, but we'll assume it's OK if ABO matches for simplicity if not in DB
    }

    return { is_compatible: isCompatible };
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
    const existing = await this.prisma.blood_compatibility.findFirst({
      where: {
        component_id: dto.component_id,
        donor_blood_type_id: dto.donor_blood_type_id,
        recipient_blood_type_id: dto.recipient_blood_type_id
      }
    });

    if (existing) {
      throw new BadRequestException('Quy tắc tương thích này đã tồn tại trong hệ thống!');
    }

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
    const existing = await this.prisma.blood_compatibility.findFirst({
      where: {
        component_id: dto.component_id,
        donor_blood_type_id: dto.donor_blood_type_id,
        recipient_blood_type_id: dto.recipient_blood_type_id,
        compatibility_id: { not: id }
      }
    });

    if (existing) {
      throw new BadRequestException('Quy tắc tương thích này đã tồn tại trong hệ thống!');
    }

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

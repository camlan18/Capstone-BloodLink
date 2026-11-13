import { Controller, Get, Post, Put, Body, Param, ParseIntPipe, Query, Res, UploadedFile, UseInterceptors, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { MasterDataService } from './master-data.service';
import { Public, Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';
import { 
  CreateBloodTypeDto, UpdateBloodTypeDto, 
  CreateFacilityDto, UpdateFacilityDto,
  CreateBloodComponentDto, UpdateBloodComponentDto,
  CreateBloodCompatibilityDto, UpdateBloodCompatibilityDto,
  CreateDonationIntervalRuleDto, UpdateDonationIntervalRuleDto
} from './dto/master-data.dto';
import { MasterDataFilterDto } from './dto/master-data-filter.dto';
import { Delete } from '@nestjs/common';

/**
 * Controller cung cấp API tra cứu công khai và quản trị danh mục dữ liệu chuẩn.
 */
@Controller('api/v1/master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  /**
   * Lấy danh sách thành phần máu có hỗ trợ lọc và phân trang.
   */
  @Public()
  @Get('blood-components')
  async getBloodComponents(@Query() query: MasterDataFilterDto) {
    return await this.masterDataService.getBloodComponents(query);
  }

  /**
   * Lấy danh sách quy tắc tương thích truyền máu.
   */
  @Public()
  @Get('blood-compatibilities')
  async getBloodCompatibilities(@Query() query: MasterDataFilterDto) {
    return await this.masterDataService.getBloodCompatibilities(query);
  }

  /**
   * Lấy danh sách quy tắc khoảng cách ngày giữa các lần hiến máu.
   */
  @Public()
  @Get('donation-interval-rules')
  async getDonationIntervalRules(@Query() query: MasterDataFilterDto) {
    return await this.masterDataService.getDonationIntervalRules(query);
  }

  /**
   * Lấy danh sách các mức độ khẩn cấp trong yêu cầu máu.
   */
  @Public()
  @Get('urgency-levels')
  async getUrgencyLevels() {
    return await this.masterDataService.getUrgencyLevels();
  }

  /**
   * Lấy danh sách nhóm máu.
   */
  @Public()
  @Get('blood-types')
  async getBloodTypes(@Query() query: MasterDataFilterDto) {
    return await this.masterDataService.getBloodTypes(query);
  }

  /**
   * Lấy danh sách tỉnh/thành phố phục vụ tra cứu địa giới hành chính.
   */
  @Public()
  @Get('provinces')
  async getProvinces() {
    return await this.masterDataService.getProvinces();
  }



  /**
   * Lấy danh sách xã/phường thuộc một tỉnh/thành phố theo ID.
   */
  @Public()
  @Get('provinces/:id/wards')
  async getWards(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.getWards(id);
  }

  /**
   * Lấy danh sách cơ sở y tế.
   */
  @Public()
  @Get('facilities')
  async getFacilities(@Query() query: MasterDataFilterDto) {
    return await this.masterDataService.getFacilities(query);
  }

  /**
   * Lấy danh sách các vai trò người dùng trong hệ thống.
   */
  @Public()
  @Get('roles')
  async getRoles() {
    return await this.masterDataService.getRoles();
  }

  /**
   * Kiểm tra khả năng truyền máu tương thích giữa nhóm máu cho, nhận và thành phần máu.
   */
  @Public()
  @Post('check-compatibility')
  async checkCompatibility(
    @Body('donorBloodTypeId', ParseIntPipe) donorBloodTypeId: number,
    @Body('recipientBloodTypeId', ParseIntPipe) recipientBloodTypeId: number,
    @Body('componentId', ParseIntPipe) componentId: number
  ) {
    return await this.masterDataService.checkCompatibility(donorBloodTypeId, recipientBloodTypeId, componentId);
  }

  /**
   * Quản trị viên thêm mới nhóm máu vào danh mục.
   */
  // --- ADMIN ROUTES ---
  @Roles(RoleCode.ADMIN)
  @Post('blood-types')
  async createBloodType(@Body() dto: CreateBloodTypeDto) {
    return await this.masterDataService.createBloodType(dto);
  }

  /**
   * Quản trị viên cập nhật thông tin nhóm máu theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Put('blood-types/:id')
  async updateBloodType(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBloodTypeDto) {
    return await this.masterDataService.updateBloodType(id, dto);
  }

  /**
   * Xuất danh sách cơ sở y tế ra tệp Excel.
   */
  @Roles(RoleCode.ADMIN)
  @Get('facilities/export')
  async exportFacilitiesExcel(@Query() query: MasterDataFilterDto, @Res() res: Response) {
    const buffer = await this.masterDataService.exportFacilitiesExcel(query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=facilities.xlsx');
    res.send(buffer);
  }

  /**
   * Tải tệp Excel mẫu để nhập danh sách cơ sở y tế hàng loạt.
   */
  @Roles(RoleCode.ADMIN)
  @Get('facilities/template')
  async downloadFacilitiesTemplate(@Res() res: Response) {
    const buffer = await this.masterDataService.getFacilitiesTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=facilities_template.xlsx');
    res.send(buffer);
  }

  /**
   * Nhập danh sách cơ sở y tế từ tệp Excel tải lên.
   */
  @Roles(RoleCode.ADMIN)
  @Post('facilities/import')
  @UseInterceptors(FileInterceptor('file'))
  async importFacilitiesExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn file Excel');
    return await this.masterDataService.importFacilitiesExcel(file.buffer);
  }

  /**
   * Lấy thông tin cơ sở y tế gắn với nhân viên bệnh viện hiện tại.
   */
  @Roles(RoleCode.ADMIN, RoleCode.HOSPITAL_STAFF)
  @Get('my-facility')
  async getMyFacility(@Req() req: any) {
    return await this.masterDataService.getMyFacility(req.user);
  }

  /**
   * Cập nhật mẫu con dấu và chữ ký xác nhận cho cơ sở y tế.
   */
  @Roles(RoleCode.ADMIN, RoleCode.HOSPITAL_STAFF)
  @Put('facilities/:id/seal-signature')
  async updateFacilitySealSignature(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @Req() req: any) {
    return await this.masterDataService.updateFacilitySealSignature(id, dto, req.user);
  }

  /**
   * Lấy thông tin chi tiết một cơ sở y tế theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Get('facilities/:id')
  async getFacilityById(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.getFacilityById(id);
  }

  /**
   * Quản trị viên tạo mới cơ sở y tế.
   */
  @Roles(RoleCode.ADMIN)
  @Post('facilities')
  async createFacility(@Body() dto: CreateFacilityDto) {
    return await this.masterDataService.createFacility(dto);
  }

  /**
   * Quản trị viên cập nhật thông tin cơ sở y tế theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Put('facilities/:id')
  async updateFacility(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFacilityDto) {
    return await this.masterDataService.updateFacility(id, dto);
  }

  /**
   * Quản trị viên xóa cơ sở y tế theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Delete('facilities/:id')
  async deleteFacility(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.deleteFacility(id);
  }

  /**
   * Quản trị viên xóa nhóm máu theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Delete('blood-types/:id')
  async deleteBloodType(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.deleteBloodType(id);
  }

  /**
   * Quản trị viên tạo mới thành phần máu.
   */
  // --- BLOOD COMPONENTS ---
  @Roles(RoleCode.ADMIN)
  @Post('blood-components')
  async createBloodComponent(@Body() dto: CreateBloodComponentDto) {
    return await this.masterDataService.createBloodComponent(dto);
  }

  /**
   * Quản trị viên cập nhật thành phần máu theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Put('blood-components/:id')
  async updateBloodComponent(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBloodComponentDto) {
    return await this.masterDataService.updateBloodComponent(id, dto);
  }

  /**
   * Quản trị viên xóa thành phần máu theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Delete('blood-components/:id')
  async deleteBloodComponent(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.deleteBloodComponent(id);
  }

  /**
   * Quản trị viên tạo mới quy tắc tương thích truyền máu.
   */
  // --- BLOOD COMPATIBILITY ---
  @Roles(RoleCode.ADMIN)
  @Post('blood-compatibilities')
  async createBloodCompatibility(@Body() dto: CreateBloodCompatibilityDto) {
    return await this.masterDataService.createBloodCompatibility(dto);
  }

  /**
   * Quản trị viên cập nhật quy tắc tương thích truyền máu theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Put('blood-compatibilities/:id')
  async updateBloodCompatibility(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBloodCompatibilityDto) {
    return await this.masterDataService.updateBloodCompatibility(id, dto);
  }

  /**
   * Quản trị viên xóa quy tắc tương thích truyền máu theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Delete('blood-compatibilities/:id')
  async deleteBloodCompatibility(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.deleteBloodCompatibility(id);
  }

  /**
   * Quản trị viên tạo mới quy tắc khoảng cách ngày hiến máu.
   */
  // --- DONATION INTERVAL RULES ---
  @Roles(RoleCode.ADMIN)
  @Post('donation-interval-rules')
  async createDonationIntervalRule(@Body() dto: CreateDonationIntervalRuleDto) {
    return await this.masterDataService.createDonationIntervalRule(dto);
  }

  /**
   * Quản trị viên cập nhật quy tắc khoảng cách ngày hiến máu theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Put('donation-interval-rules/:id')
  async updateDonationIntervalRule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDonationIntervalRuleDto) {
    return await this.masterDataService.updateDonationIntervalRule(id, dto);
  }

  /**
   * Quản trị viên xóa quy tắc khoảng cách ngày hiến máu theo ID.
   */
  @Roles(RoleCode.ADMIN)
  @Delete('donation-interval-rules/:id')
  async deleteDonationIntervalRule(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.deleteDonationIntervalRule(id);
  }
}

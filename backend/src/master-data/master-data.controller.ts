import { Controller, Get, Post, Put, Body, Param, ParseIntPipe, UseGuards, Query, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
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

@Controller('api/v1/master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Public()
  @Get('blood-components')
  async getBloodComponents(@Query() query: MasterDataFilterDto) {
    return await this.masterDataService.getBloodComponents(query);
  }

  @Public()
  @Get('blood-compatibilities')
  async getBloodCompatibilities(@Query() query: MasterDataFilterDto) {
    return await this.masterDataService.getBloodCompatibilities(query);
  }

  @Public()
  @Get('donation-interval-rules')
  async getDonationIntervalRules(@Query() query: MasterDataFilterDto) {
    return await this.masterDataService.getDonationIntervalRules(query);
  }

  @Public()
  @Get('urgency-levels')
  async getUrgencyLevels() {
    return await this.masterDataService.getUrgencyLevels();
  }

  @Public()
  @Get('blood-types')
  async getBloodTypes(@Query() query: MasterDataFilterDto) {
    return await this.masterDataService.getBloodTypes(query);
  }

  @Public()
  @Get('provinces')
  async getProvinces() {
    return await this.masterDataService.getProvinces();
  }

  @Public()
  @Get('provinces/:id/districts')
  async getDistricts(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.getDistricts(id);
  }

  @Public()
  @Get('districts/:id/wards')
  async getWards(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.getWards(id);
  }

  @Public()
  @Get('facilities')
  async getFacilities(@Query() query: MasterDataFilterDto) {
    return await this.masterDataService.getFacilities(query);
  }

  @Public()
  @Get('roles')
  async getRoles() {
    return await this.masterDataService.getRoles();
  }

  // --- ADMIN ROUTES ---
  @Roles(RoleCode.ADMIN)
  @Post('blood-types')
  async createBloodType(@Body() dto: CreateBloodTypeDto) {
    return await this.masterDataService.createBloodType(dto);
  }

  @Roles(RoleCode.ADMIN)
  @Put('blood-types/:id')
  async updateBloodType(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBloodTypeDto) {
    return await this.masterDataService.updateBloodType(id, dto);
  }

  @Roles(RoleCode.ADMIN)
  @Get('facilities/export')
  async exportFacilitiesExcel(@Query() query: MasterDataFilterDto, @Res() res: Response) {
    const buffer = await this.masterDataService.exportFacilitiesExcel(query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=facilities.xlsx');
    res.send(buffer);
  }

  @Roles(RoleCode.ADMIN)
  @Get('facilities/template')
  async downloadFacilitiesTemplate(@Res() res: Response) {
    const buffer = await this.masterDataService.getFacilitiesTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=facilities_template.xlsx');
    res.send(buffer);
  }

  @Roles(RoleCode.ADMIN)
  @Post('facilities/import')
  @UseInterceptors(FileInterceptor('file'))
  async importFacilitiesExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn file Excel');
    return await this.masterDataService.importFacilitiesExcel(file.buffer);
  }

  @Roles(RoleCode.ADMIN)
  @Get('facilities/:id')
  async getFacilityById(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.getFacilityById(id);
  }

  @Roles(RoleCode.ADMIN)
  @Post('facilities')
  async createFacility(@Body() dto: CreateFacilityDto) {
    return await this.masterDataService.createFacility(dto);
  }

  @Roles(RoleCode.ADMIN)
  @Put('facilities/:id')
  async updateFacility(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFacilityDto) {
    return await this.masterDataService.updateFacility(id, dto);
  }

  @Roles(RoleCode.ADMIN)
  @Delete('facilities/:id')
  async deleteFacility(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.deleteFacility(id);
  }

  @Roles(RoleCode.ADMIN)
  @Delete('blood-types/:id')
  async deleteBloodType(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.deleteBloodType(id);
  }

  // --- BLOOD COMPONENTS ---
  @Roles(RoleCode.ADMIN)
  @Post('blood-components')
  async createBloodComponent(@Body() dto: CreateBloodComponentDto) {
    return await this.masterDataService.createBloodComponent(dto);
  }

  @Roles(RoleCode.ADMIN)
  @Put('blood-components/:id')
  async updateBloodComponent(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBloodComponentDto) {
    return await this.masterDataService.updateBloodComponent(id, dto);
  }

  @Roles(RoleCode.ADMIN)
  @Delete('blood-components/:id')
  async deleteBloodComponent(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.deleteBloodComponent(id);
  }

  // --- BLOOD COMPATIBILITY ---
  @Roles(RoleCode.ADMIN)
  @Post('blood-compatibilities')
  async createBloodCompatibility(@Body() dto: CreateBloodCompatibilityDto) {
    return await this.masterDataService.createBloodCompatibility(dto);
  }

  @Roles(RoleCode.ADMIN)
  @Put('blood-compatibilities/:id')
  async updateBloodCompatibility(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBloodCompatibilityDto) {
    return await this.masterDataService.updateBloodCompatibility(id, dto);
  }

  @Roles(RoleCode.ADMIN)
  @Delete('blood-compatibilities/:id')
  async deleteBloodCompatibility(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.deleteBloodCompatibility(id);
  }

  // --- DONATION INTERVAL RULES ---
  @Roles(RoleCode.ADMIN)
  @Post('donation-interval-rules')
  async createDonationIntervalRule(@Body() dto: CreateDonationIntervalRuleDto) {
    return await this.masterDataService.createDonationIntervalRule(dto);
  }

  @Roles(RoleCode.ADMIN)
  @Put('donation-interval-rules/:id')
  async updateDonationIntervalRule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDonationIntervalRuleDto) {
    return await this.masterDataService.updateDonationIntervalRule(id, dto);
  }

  @Roles(RoleCode.ADMIN)
  @Delete('donation-interval-rules/:id')
  async deleteDonationIntervalRule(@Param('id', ParseIntPipe) id: number) {
    return await this.masterDataService.deleteDonationIntervalRule(id);
  }
}

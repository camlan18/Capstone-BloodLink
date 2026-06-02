import { Controller, Get, Post, Put, Body, Req, Query, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { DonorService } from './donor.service';
import { Roles, Public } from '../common/decorators';
import { RoleCode } from '../common/enums';
import { PaginationDto } from '../common/pagination.dto';
import { BookDonationSlotDto } from './dto/donor.dto';
import { RecordDonationDto, UpdateSlotStatusDto, UpdateDonorProfileDto } from './dto/donor.dto';

@Controller('api/v1/donor')
export class DonorController {
  constructor(private readonly donorService: DonorService) {}

  @Post('register')
  async registerDonor(@Req() req: any, @Body() data: any) {
    return await this.donorService.registerDonorProfile(req.user.user_id, data);
  }

  @Get('profile')
  async getProfile(@Req() req: any) {
    return await this.donorService.getDonorProfile(req.user.user_id);
  }

  @Put('profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateDonorProfileDto) {
    return await this.donorService.updateDonorProfile(req.user.user_id, dto);
  }

  @Put('availability')
  async updateAvailability(@Req() req: any, @Body() body: { is_available: boolean }) {
    return await this.donorService.updateAvailability(req.user.user_id, body.is_available);
  }

  @Post('book-slot')
  async bookSlot(@Req() req: any, @Body() dto: BookDonationSlotDto) {
    return await this.donorService.bookDonationSlot(req.user.user_id, dto);
  }

  @Post('cancel-slot/:id')
  async cancelSlot(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.donorService.cancelDonationSlot(req.user.user_id, id);
  }

  @Get('history')
  async getHistory(@Req() req: any) {
    return await this.donorService.getDonationHistory(req.user.user_id);
  }

  @Get('my-slots')
  async getMySlots(@Req() req: any) {
    return await this.donorService.getMySlots(req.user.user_id);
  }

  @Public()
  @Get('schedules')
  async getSchedules(@Query('facilityId') facilityId: string) {
    return await this.donorService.getSchedules(facilityId ? Number(facilityId) : undefined);
  }

  // --- FACILITY ADMIN ROUTES ---
  @Roles(RoleCode.FACILITY_ADMIN)
  @Get('slots')
  async getSlots(@Query() query: PaginationDto) {
    return await this.donorService.getSlots(query);
  }

  @Roles(RoleCode.FACILITY_ADMIN)
  @Put('slots/:id/status')
  async updateSlotStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSlotStatusDto) {
    return await this.donorService.updateSlotStatus(id, dto);
  }

  @Roles(RoleCode.FACILITY_ADMIN)
  @Post('donations')
  async recordDonation(@Req() req: any, @Body() dto: RecordDonationDto) {
    return await this.donorService.recordDonation(req.user.user_id, dto);
  }
}

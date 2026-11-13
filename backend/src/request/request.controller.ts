import { Controller, Post, Put, Delete, Body, Param, ParseIntPipe, Get, Req, UseGuards, Query, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { RequestService } from './request.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateMatchStatusDto, AllocateInventoryDto } from './dto/matching-allocation.dto';
import { Roles, Public } from '../common/decorators';
import { RoleCode } from '../common/enums';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

/**
 * Controller cung cấp các endpoint quản lý yêu cầu cần máu: tạo mới, theo dõi, import/export Excel,
 * ghép nối người hiến phù hợp và cấp phát/giải phóng túi máu.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/requests')
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  /** Tạo yêu cầu máu nội bộ bởi Admin hoặc Nhân viên y tế. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post()
  async createRequest(@Req() req: any, @Body() dto: CreateRequestDto) {
    return await this.requestService.createRequest(dto, req.user);
  }

  /** Tạo yêu cầu máu công khai (hỗ trợ cả khách vãng lai hoặc người dùng đã đăng nhập). */
  @Public()
  @Post('public')
  async createPublicRequest(@Req() req: any, @Body() dto: CreateRequestDto) {
    const userId = req.user && req.user.user_id ? req.user.user_id : null;
    return await this.requestService.createPublicRequest(dto, userId);
  }

  /** Lấy danh sách các yêu cầu máu đang hiển thị công khai trên hệ thống. */
  @Public()
  @Get('public')
  async getPublicRequests(@Query() query: any) {
    query.is_public_view = true;
    return await this.requestService.getRequests(query);
  }

  /** Tra cứu chi tiết một yêu cầu máu công khai theo mã yêu cầu. */
  @Public()
  @Get('public/code/:code')
  async getPublicRequestByCode(@Param('code') code: string) {
    return await this.requestService.getRequestByCode(code);
  }

  /** Đưa yêu cầu vào trạng thái đang xử lý (PROCESSING) hoặc hoàn tất kiểm tra điều kiện xử lý. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/process')
  async processRequest(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.requestService.processRequest(id, req.user);
  }

  /** Lấy danh sách các yêu cầu máu do chính người dùng hiện tại đã tạo. */
  @Get('my')
  async getMyRequests(@Req() req: any, @Query() query: any) {
    const userId = req.user.user_id;
    return await this.requestService.getRequests({ ...query, requester_user_id: userId });
  }

  /** Xem chi tiết một yêu cầu máu thuộc sở hữu của người dùng hiện tại. */
  @Get('my/:id')
  async getMyRequestDetail(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.user_id;
    return await this.requestService.getRequestById(id, userId);
  }

  /** Lấy danh sách yêu cầu máu (có phân trang, lọc và giới hạn theo cơ sở đối với nhân viên bệnh viện). */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get()
  async getRequests(@Query() query: any, @Req() req: any) {
    return await this.requestService.getRequests(query, req.user);
  }

  /** Xuất danh sách yêu cầu máu ra file Excel (.xlsx). */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get('export')
  async exportExcel(@Query() query: any, @Res() res: Response, @Req() req: any) {
    const buffer = await this.requestService.exportExcel(query, req.user);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=requests.xlsx');
    res.send(buffer);
  }

  /** Tải file Excel mẫu phục vụ nhập hàng loạt yêu cầu máu. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.requestService.getTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=requests_template.xlsx');
    res.send(buffer);
  }

  /** Nhập hàng loạt yêu cầu máu từ file Excel tải lên. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Vui lòng chọn file Excel');
    return await this.requestService.importExcel(file.buffer, req.user);
  }

  /** Cập nhật thông tin một yêu cầu máu theo ID. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Put(':id')
  async updateRequest(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateRequestDto>) {
    return await this.requestService.updateRequest(id, dto, req.user);
  }

  /** Xóa yêu cầu máu (chỉ cho phép ở trạng thái hợp lệ và đúng quyền cơ sở). */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Delete(':id')
  async deleteRequest(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.requestService.deleteRequest(id, req.user);
  }

  /** Hủy yêu cầu máu và hoàn trả các túi máu đã cấp phát (nếu có). */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/cancel')
  async cancelRequest(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.requestService.cancelRequest(id, req.user);
  }

  // --- MATCHING & ALLOCATION (ADMIN ONLY) ---

  /** Lấy danh sách các lượt ghép nối người hiến máu của một yêu cầu. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get(':id/matches')
  async getMatches(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.requestService.getMatches(id, req.user);
  }

  /** Tự động tìm kiếm người hiến máu tương thích theo nhóm máu, bán kính và trạng thái sẵn sàng. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/matches/find')
  async findDonorMatches(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.requestService.findDonorMatches(id, req.user);
  }

  /** Cập nhật trạng thái phản hồi ghép nối (CONTACTED, ACCEPTED, REJECTED). */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Put('matches/:matchId/status')
  async updateMatchStatus(@Req() req: any, @Param('matchId', ParseIntPipe) matchId: number, @Body() dto: UpdateMatchStatusDto) {
    return await this.requestService.updateMatchStatus(matchId, dto.status, req.user);
  }

  /** Xem danh sách túi máu đã được cấp phát cho yêu cầu. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Get(':id/allocations')
  async getAllocations(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.requestService.getAllocations(id, req.user);
  }

  /** Cấp phát danh sách túi máu trong kho cho yêu cầu cần máu. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/allocations')
  async allocateInventory(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: AllocateInventoryDto) {
    return await this.requestService.allocateInventory(id, dto.inventory_ids, req.user);
  }

  /** Hủy cấp phát và trả túi máu về lại trạng thái AVAILABLE trong kho. */
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Delete('allocations/:allocationId')
  async releaseAllocation(@Req() req: any, @Param('allocationId', ParseIntPipe) allocationId: number) {
    return await this.requestService.releaseAllocation(allocationId, req.user);
  }
}

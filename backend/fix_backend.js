const fs = require('fs');

const controllerFile = 'src/transfer/transfer.controller.ts';
let ctrl = fs.readFileSync(controllerFile, 'utf8');

const deliverRoute = `
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/deliver')
  async deliverTransfer(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return await this.transferService.deliverTransfer(id, req.user);
  }

  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/receive')`;

ctrl = ctrl.replace(`
  @Roles(RoleCode.ADMIN, RoleCode.STAFF, RoleCode.HOSPITAL_STAFF)
  @Post(':id/receive')`, deliverRoute);

fs.writeFileSync(controllerFile, ctrl);

const serviceFile = 'src/transfer/transfer.service.ts';
let svc = fs.readFileSync(serviceFile, 'utf8');

const deliverService = `
  /**
   * Đã giao (IN_TRANSIT -> DELIVERED)
   */
  async deliverTransfer(transferId: number, user: any) {
    return await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.blood_transfers.findUnique({
        where: { transfer_id: transferId },
      });

      if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển máu');
      if (transfer.status !== 'IN_TRANSIT') {
        throw new BadRequestException(\`Phiếu đang ở trạng thái \${transfer.status}, chưa được vận chuyển\`);
      }

      // Check permission if needed... usually Sender or Admin

      const updated = await tx.blood_transfers.update({
        where: { transfer_id: transferId },
        data: {
          status: 'DELIVERED',
          updated_at: new Date(),
        },
        include: {
          from_facility: true,
          to_facility: true,
          blood_type: true,
          component: true,
          inventory: true,
        },
      });

      return { data: updated, message: 'Đã xác nhận giao hàng. Chờ cơ sở nhận xác nhận.' };
    });
  }

  /**
   * 4. Nhận kho (DELIVERED → RECEIVED)
   * Cơ sở nhận xác nhận đã nhận máu, inventory chuyển sang cơ sở mới
   */
  async receiveTransfer(transferId: number, user: any) {`;

svc = svc.replace(`
  /**
   * 4. Nhận kho (IN_TRANSIT → RECEIVED)
   * Cơ sở nhận xác nhận đã nhận máu, inventory chuyển sang cơ sở mới
   */
  async receiveTransfer(transferId: number, user: any) {`, deliverService);

svc = svc.replace(`if (transfer.status !== 'IN_TRANSIT') {
        throw new BadRequestException(\`Phiếu đang ở trạng thái \${transfer.status}, chưa được xuất kho\`);
      }`, `if (transfer.status !== 'DELIVERED' && transfer.status !== 'IN_TRANSIT') {
        throw new BadRequestException(\`Phiếu đang ở trạng thái \${transfer.status}, chưa được giao đến\`);
      }`);

fs.writeFileSync(serviceFile, svc);

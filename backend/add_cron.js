const fs = require('fs');
const file = 'src/transfer/transfer.service.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('@nestjs/schedule')) {
  content = content.replace(
    "import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';",
    "import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';\nimport { Cron, CronExpression } from '@nestjs/schedule';"
  );
}

const cronMethod = `
  /**
   * Cron job chạy mỗi phút để quét các phiếu yêu cầu máu đã quá hạn (required_before < now).
   * Nếu trạng thái vẫn là PENDING hoặc APPROVED (chưa được IN_TRANSIT, DELIVERED, RECEIVED),
   * thì sẽ tự động chuyển sang CANCELLED.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredTransfers() {
    try {
      const expiredTransfers = await this.prisma.blood_transfers.findMany({
        where: {
          required_before: {
            lt: new Date(),
          },
          status: {
            in: ['PENDING', 'APPROVED'],
          },
        },
      });

      if (expiredTransfers.length > 0) {
        const ids = expiredTransfers.map(t => t.transfer_id);
        
        await this.prisma.blood_transfers.updateMany({
          where: { transfer_id: { in: ids } },
          data: {
            status: 'CANCELLED',
            reject_reason: 'Hệ thống tự động hủy do quá hạn thời gian yêu cầu',
            updated_at: new Date(),
          },
        });

        this.logger.log(\`[Cron] Đã hủy \${ids.length} phiếu yêu cầu máu quá hạn.\`);
      }
    } catch (error) {
      this.logger.error('[Cron] Lỗi khi quét phiếu quá hạn', error);
    }
  }
`;

if (!content.includes('handleExpiredTransfers')) {
  content = content.replace(/}\s*$/, cronMethod + '\n}\n');
}

fs.writeFileSync(file, content);
console.log('Cron job added');

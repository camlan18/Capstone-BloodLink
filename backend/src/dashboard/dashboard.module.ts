import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Module tổng hợp số liệu thống kê dashboard và xuất báo cáo hệ thống.
 */
@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

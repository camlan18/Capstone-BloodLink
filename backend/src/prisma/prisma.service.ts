import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Service kế thừa PrismaClient quản lý vòng đời kết nối và ngắt kết nối cơ sở dữ liệu theo module NestJS.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['warn', 'error'],
    });
  }

  /** Kết nối PrismaClient tới cơ sở dữ liệu khi module được khởi tạo. */
  async onModuleInit() {
    await this.$connect();
  }

  /** Ngắt kết nối PrismaClient an toàn khi ứng dụng/module dừng hoạt động. */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}


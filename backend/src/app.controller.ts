import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators';

/**
 * Controller gốc kiểm tra tình trạng hoạt động của API.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Endpoint công khai trả về thông điệp chào mừng khi kiểm tra health-check.
   */
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

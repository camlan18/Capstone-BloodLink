import { Injectable } from '@nestjs/common';

/**
 * Service gốc cung cấp phản hồi kiểm tra sức khỏe cho AppController.
 */
@Injectable()
export class AppService {
  /**
   * Trả về chuỗi chào mừng mặc định của hệ thống HienMau.
   */
  getHello(): string {
    return 'Welcome to HienMau Donation Platform!';
  }
}

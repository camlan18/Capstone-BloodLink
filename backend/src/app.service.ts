import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Chào mưng bạn đến với hệ thống API của Blood Link!';
  }
}

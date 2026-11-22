import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/response.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Hàm khởi chạy ứng dụng NestJS: bật CORS, ValidationPipe toàn cục, ResponseInterceptor, Swagger và lắng nghe cổng HTTP.
 */
async function bootstrap() {
  // Bổ sung toJSON cho kiểu BigInt để JSON.stringify không bị lỗi khi serialize dữ liệu Prisma
  // Polyfill for BigInt serialization
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  // Khởi tạo ứng dụng NestJS từ root module
  const app = await NestFactory.create(AppModule);
  
  // Cấu hình CORS cho phép Frontend gọi API kèm cookie/header xác thực
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Kích hoạt ValidationPipe toàn cục (tự loại bỏ field thừa & ép kiểu DTO) và chuẩn hóa response
  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // Khởi tạo tài liệu OpenAPI/Swagger tại đường dẫn /api/docs
  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('HienMau API')
    .setDescription('The API documentation for HienMau Project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

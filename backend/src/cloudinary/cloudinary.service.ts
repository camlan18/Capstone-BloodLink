import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

/**
 * Service xử lý tải lên tệp hình ảnh lên dịch vụ lưu trữ Cloudinary.
 */
@Injectable()
export class CloudinaryService {
  /**
   * Tải buffer của ảnh tải lên từ Multer vào Cloudinary thông qua stream.
   */
  uploadFile(file: Express.Multer.File): Promise<any> {
    // Mở luồng upload_stream lên Cloudinary và pipe buffer ảnh trực tiếp từ Multer memory storage
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream((error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
      Readable.from(file.buffer).pipe(upload);
    });
  }
}

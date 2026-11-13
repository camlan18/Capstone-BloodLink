import { v2 as cloudinary } from 'cloudinary';

/**
 * Provider khởi tạo cấu hình SDK Cloudinary từ biến môi trường.
 */
export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    return cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  },
};

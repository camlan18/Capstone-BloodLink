import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Cấu trúc JSON phản hồi chuẩn hóa cho toàn bộ API Backend.
 */
export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: any;
}

/**
 * Interceptor toàn cục tự động đóng gói dữ liệu trả về từ controller theo định dạng `{ statusCode, message, data, meta? }`.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  /** Chặn và chuẩn hóa luồng dữ liệu trả về trước khi gửi response về client. */
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => {
        // Trường hợp 1: Kết quả đã có sẵn cặp data và meta (API phân trang) -> giữ nguyên cấu trúc và bọc thêm statusCode
        // If data is already formatted (contains data and meta), use it
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            statusCode: context.switchToHttp().getResponse().statusCode,
            message: data.message || 'Thành công',
            data: data.data,
            meta: data.meta,
          };
        }

        // Trường hợp 2: Service không trả về dữ liệu -> chuẩn hóa data thành null
        // If data is null or undefined
        if (data === null || data === undefined) {
           return {
             statusCode: context.switchToHttp().getResponse().statusCode,
             message: 'Thành công',
             data: null as any,
           };
        }

        // Trường hợp 3: Nếu object chỉ có duy nhất khóa message thì gán data = null, ngược lại giữ nguyên payload
        // Otherwise, wrap the data
        return {
          statusCode: context.switchToHttp().getResponse().statusCode,
          message: data?.message || 'Thành công',
          data: data?.message && Object.keys(data).length === 1 ? null as any : data,
        };
      }),
    );
  }
}

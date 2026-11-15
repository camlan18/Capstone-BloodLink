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
        // If data is already formatted (contains data and meta), use it
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            statusCode: context.switchToHttp().getResponse().statusCode,
            message: data.message || 'Thành công',
            data: data.data,
            meta: data.meta,
          };
        }

        // If data is null or undefined
        if (data === null || data === undefined) {
           return {
             statusCode: context.switchToHttp().getResponse().statusCode,
             message: 'Thành công',
             data: null as any,
           };
        }

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

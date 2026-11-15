import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

/** Middleware xử lý định tuyến đa ngôn ngữ của next-intl cho mọi request hợp lệ. */
export default createMiddleware(routing);

/** Cấu hình phạm vi đường dẫn áp dụng middleware i18n, bỏ qua API và file tĩnh. */
export const config = {
  // Skip all paths that should not be internationalized
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

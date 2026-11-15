import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

/** Cấu hình định tuyến đa ngôn ngữ hỗ trợ tiếng Việt (mặc định) và tiếng Anh. */
export const routing = defineRouting({
  locales: ['vi', 'en'],
  defaultLocale: 'vi'
});

/** Các helper điều hướng (Link, redirect, usePathname, useRouter) tự động gắn tiền tố locale. */
export const {Link, redirect, usePathname, useRouter} = createNavigation(routing);

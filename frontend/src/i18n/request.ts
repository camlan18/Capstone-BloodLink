import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';

/**
 * Cấu hình nạp file từ điển ngôn ngữ (`messages/<locale>.json`) cho next-intl ở phía server.
 */
export default getRequestConfig(async ({requestLocale}) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});

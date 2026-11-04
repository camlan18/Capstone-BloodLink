'use client';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-blood focus:outline-none focus:ring-2 focus:ring-blood/20 transition-colors">
        <span className="flex items-center justify-center" title={locale === 'vi' ? 'Tiếng Việt' : 'English'}>
          {locale === 'vi' ? (
            <img src="https://flagcdn.com/vn.svg" alt="VN" className="w-6 h-auto rounded-sm object-cover shadow-sm" />
          ) : (
            <img src="https://flagcdn.com/us.svg" alt="EN" className="w-6 h-auto rounded-sm object-cover shadow-sm" />
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchLocale('vi')} className={locale === 'vi' ? 'font-bold' : ''}>
          <img src="https://flagcdn.com/vn.svg" alt="VN" className="w-5 h-auto rounded-sm object-cover shadow-sm mr-2" /> Tiếng Việt
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLocale('en')} className={locale === 'en' ? 'font-bold' : ''}>
          <img src="https://flagcdn.com/us.svg" alt="EN" className="w-5 h-auto rounded-sm object-cover shadow-sm mr-2" /> English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

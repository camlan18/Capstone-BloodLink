'use client';
import { Link } from '@/i18n/routing';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { usePathname } from '@/i18n/routing';
import { useAuthStore } from '@/lib/stores';
import { educationService } from '@/lib/services/education';
import { Droplet, Menu, LogOut, User as UserIcon, X, ChevronDown, Heart, Clock, CalendarPlus, LayoutDashboard, Bell, ClipboardList } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';
import { notificationService } from '@/lib/services/notification';
import { useTranslations } from 'next-intl';

const getNavLinks = (t: any) => [
  { name: t('navHome'), href: '/' },
  { name: t('navSearch'), href: '/blood-requests' },
  { name: t('navSchedule'), href: '/schedules' },
  { name: t('navLeaderboard'), href: '/leaderboard' },
  { 
    name: t('navAbout'), 
    href: '/about',
    submenu: [
      { name: t('aboutStory'), href: '/about#story', description: t('aboutStoryDesc') },
      { name: t('aboutVision'), href: '/about#vision', description: t('aboutVisionDesc') },
      { name: t('aboutTeam'), href: '/about#team', description: t('aboutTeamDesc') },
      { name: t('aboutAchievements'), href: '/about#achievements', description: t('aboutAchievementsDesc') },
    ]
  },
  { 
    name: t('navEducation'), 
    href: '/education',
    submenu: [
      { name: t('eduGeneral'), href: '/education?category=1', description: t('eduGeneralDesc') },
      { name: t('eduProcess'), href: '/education?category=2', description: t('eduProcessDesc') },
      { name: t('eduBenefits'), href: '/education?category=3', description: t('eduBenefitsDesc') },
      { name: t('eduFAQ'), href: '/education?category=4', description: t('eduFAQDesc') },
    ]
  },
  { name: t('navContact'), href: '/contact' },
];

export const Header = () => {
  const t = useTranslations('Header');
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dynamicLinks, setDynamicLinks] = useState(getNavLinks(t));

  useEffect(() => {
    setMounted(true);
    
    const fetchCategories = async () => {
      try {
        const res = await educationService.getCategories();
        if (res.data) {
          const categories = res.data;
          setDynamicLinks(prev => prev.map(link => {
            if (link.name === t('navEducation')) {
              return {
                ...link,
                submenu: categories && categories.length > 0 
                  ? categories.map((cat: any) => {
                      let tName = cat.category_name;
                      let tDesc = cat.description;
                      if (cat.category_id === 1) { tName = t('eduGeneral'); tDesc = t('eduGeneralDesc'); }
                      if (cat.category_id === 2) { tName = t('eduProcess'); tDesc = t('eduProcessDesc'); }
                      if (cat.category_id === 3) { tName = t('eduBenefits'); tDesc = t('eduBenefitsDesc'); }
                      if (cat.category_id === 4) { tName = t('eduFAQ'); tDesc = t('eduFAQDesc'); }
                      
                      return {
                        name: tName || cat.category_name,
                        href: `/education?category=${cat.category_id}`,
                        description: tDesc || cat.description || t('eduMore')
                      };
                    })
                  : undefined
              };
            }
            return link;
          }));
        }
      } catch (error) {
        console.error('Failed to fetch education categories:', error);
      }
    };
    
    fetchCategories();
  }, []);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchUnreadCount = async () => {
        try {
          const res = await notificationService.getUnreadCount();
          if (res && res.unread_count !== undefined) {
            setUnreadCount(res.unread_count);
          }
        } catch (error) {
          console.error('Failed to fetch unread notifications count:', error);
        }
      };
      fetchUnreadCount();
      
      // Optional: Polling every 60 seconds
      const intervalId = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated]);

  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.role_code;
  const isAdmin = userRole && ['ADMIN', 'STAFF', 'MODERATOR', 'HOSPITAL_STAFF'].includes(userRole);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 flex items-center justify-center group-hover:scale-110 transition-transform">
            <img src="/logo.png" alt="BloodLink Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-bold">
            <span className="text-blood">Blood</span>
            <span className="text-navy">Link</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 relative">
          {dynamicLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
            return (
              <div key={link.href} className="relative group">
                <Link
                  href={link.href}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1 ${
                    isActive ? 'text-blood bg-red-50 font-semibold' : 'text-slate-600 hover:text-blood hover:bg-red-50'
                  }`}
                >
                  {link.name}
                  {link.submenu && link.submenu.length > 0 && <ChevronDown className="w-3 h-3 transition-transform group-hover:-rotate-180" />}
                </Link>
                
                {link.submenu && link.submenu.length > 0 && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[500px] bg-white rounded-lg shadow-xl shadow-slate-200/50 border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0 z-50">
                    <div className="p-4 grid grid-cols-2 gap-4">
                      {link.submenu.map((sub) => (
                        <Link 
                          key={sub.name} 
                          href={sub.href}
                          className="p-3 rounded-lg hover:bg-slate-50 transition-colors group/item"
                        >
                          <div className="font-semibold text-sm text-navy group-hover/item:text-blood mb-1">{sub.name}</div>
                          <div className="text-xs text-slate-500">{sub.description}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        {/* Desktop Auth */}
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <div className="hidden lg:flex items-center gap-3">
          {mounted && isAuthenticated ? (
            <>
              <Link href="/donor/notifications" className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors mr-1">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blood rounded-full border-2 border-white"></span>
                )}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors">
                <div className="w-8 h-8 rounded-md bg-blood flex items-center justify-center overflow-hidden shrink-0">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4 text-white" />
                  )}
                </div>
                <span className="text-sm font-medium text-navy">{user?.full_name}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold text-navy">{user?.full_name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem>
                    <Link href="/admin" className="w-full flex items-center gap-2 text-blood font-medium">
                      <LayoutDashboard className="h-4 w-4" /> {t('adminPage')}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Link href="/donor/profile" className="w-full flex items-center gap-2">
                    <UserIcon className="h-4 w-4" /> {t('donorProfile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/donor/history" className="w-full flex items-center gap-2">
                    <Clock className="h-4 w-4" /> {t('donorHistory')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/donor/book" className="w-full flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4" /> {t('donorBook')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/donor/requests" className="w-full flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" /> {t('bloodRequests')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-blood focus:text-blood" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-5 py-2 text-sm font-medium text-navy hover:text-blood transition-colors"
              >
                {t('login')}
              </Link>
              <Link
                href="/register"
                className="px-6 py-2.5 text-sm font-semibold text-white bg-blood hover:bg-blood-dark rounded-md transition-all hover:shadow-lg hover:shadow-blood/25"
              >
                {t('register')}
              </Link>
            </div>
          )}
          {!mounted && (
            <div className="w-24 h-10 animate-pulse bg-slate-100 rounded-md"></div>
          )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <div className="lg:hidden flex items-center gap-2">
          <LocaleSwitcher />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 animate-slide-up">
          <div className="container mx-auto px-4 py-4 space-y-1">
            {dynamicLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive ? 'text-blood bg-red-50 font-semibold' : 'text-slate-600 hover:text-blood hover:bg-red-50'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              {mounted && isAuthenticated ? (
                <>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMobileOpen(false)} className="px-4 py-3 text-sm font-medium text-blood hover:bg-red-50 rounded-lg transition-colors">
                      {t('adminPage')}
                    </Link>
                  )}
                  <Link href="/donor/profile" onClick={() => setMobileOpen(false)} className="px-4 py-3 text-sm font-medium text-slate-600 hover:text-blood hover:bg-red-50 rounded-lg transition-colors">
                    {t('donorProfile')}
                  </Link>
                  <Link href="/donor/requests" onClick={() => setMobileOpen(false)} className="px-4 py-3 text-sm font-medium text-slate-600 hover:text-blood hover:bg-red-50 rounded-lg transition-colors">
                    {t('bloodRequests')}
                  </Link>
                  <Link href="/donor/notifications" onClick={() => setMobileOpen(false)} className="flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 hover:text-blood hover:bg-red-50 rounded-lg transition-colors">
                    <span>{t('notifications')}</span>
                    {unreadCount > 0 && (
                      <span className="bg-blood text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                  </Link>
                  <button onClick={() => { logout(); setMobileOpen(false); }} className="px-4 py-3 text-sm font-medium text-blood hover:bg-red-50 rounded-lg transition-colors text-left">
                    {t('logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-sm font-medium text-navy hover:bg-slate-100 rounded-lg transition-colors text-center"
                  >
                    {t('login')}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-sm font-semibold text-white bg-blood hover:bg-blood-dark rounded-md transition-colors text-center"
                  >
                    {t('register')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

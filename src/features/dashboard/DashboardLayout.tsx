import React, { Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@mui/material';
import { Home, ChevronRight } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTitle, useFlatMenusQuery } from '../../hooks';
import { translateMenuLabel } from '../../utils/helpers';
import { PageLoader } from '../../components/ui/PageLoader';
import { BackToTop } from '../../components/ui/BackToTop';

const getFallbackItem = (items: any[], path: string): any => {
  for (const item of items) {
    if (item.key && item.key.toLowerCase() === path.toLowerCase()) {
      return item;
    }
    if (item.children && item.children.length > 0) {
      const found = getFallbackItem(item.children, path);
      if (found) return found;
    }
  }
  return null;
};

export const DashboardFeature: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const activePath = location.pathname;

  const { data: flatMenus = [] } = useFlatMenusQuery();

  const defaultSidebarItems = useMemo(() => [
    {
      key: 'lich-lam-viec',
      label: t('nav_work_schedule'),
      children: [
        { key: '/lich-lam-viec/tong-hop', label: t('work_schedule.overview') },
        { key: '/lich-lam-viec/ca-nhan', label: t('work_schedule.personal_calendar') },
        { key: '/lich-lam-viec/dang-ky-lich-lanh-dao', label: t('work_schedule.leadership_registration') },
        { key: '/lich-lam-viec/phe-duyet', label: t('work_schedule.schedule_approval') },
        { key: '/lich-lam-viec/loi-moi-tham-du', label: t('work_schedule.meeting_invitations') },
      ],
    },
    { key: '/tai-nguyen', label: t('nav_resources') },
    { key: '/cong-viec', label: t('nav_tasks') },
    { key: '/bao-cao', label: t('nav_reports') },
    { key: '/thong-bao', label: t('nav_notifications') },
    {
      key: 'he-thong',
      label: t('system'),
      children: [
        { key: '/he-thong/nhan-vien', label: t('system_employees') },
        { key: '/he-thong/vai-tro', label: t('system_roles') },
        { key: '/he-thong/phan-quyen', label: t('system_permissions') },
        { key: '/he-thong/cau-hinh-menu', label: t('system_menu_config') },
        { key: '/he-thong/cau-hinh-mail', label: t('system_mail_config') },
      ],
    },
    {
      key: 'danh-muc',
      label: t('categories'),
      children: [
        { key: '/danh-muc/don-vi-phong-ban', label: t('categories_department') },
        { key: '/danh-muc/loai-lich-hop', label: t('categories_meeting_type') },
      ],
    },
  ], [t]);

  const breadcrumbs = useMemo(() => {
    const items = [{ title: <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><Home size={12} /> {t('console')}</span> }];
    const activePathLower = activePath.toLowerCase();

    const currentMenuItem = flatMenus.find(
      (m) => m && m.url && m.url.toLowerCase() === activePathLower
    );

    if (currentMenuItem) {
      if (currentMenuItem.parentId) {
        const parentMenuItem = flatMenus.find((m) => m && m.id === currentMenuItem.parentId);
        if (parentMenuItem) {
          items.push({ title: <span className="text-slate-500 dark:text-slate-400">{translateMenuLabel(parentMenuItem.name, parentMenuItem.url)}</span> });
        }
      }
      items.push({
        title: <span className="font-medium text-slate-800 dark:text-slate-200">{translateMenuLabel(currentMenuItem.name, currentMenuItem.url)}</span>
      });
    } else {
      const fallbackItem = getFallbackItem(defaultSidebarItems, activePath);
      if (fallbackItem) {
        const parentFallback = defaultSidebarItems.find(
          (parent) => parent.children && parent.children.some((child) => child.key && child.key.toLowerCase() === activePathLower)
        );
        if (parentFallback) {
          items.push({ title: <span className="text-slate-500 dark:text-slate-400">{parentFallback.label}</span> });
        }
        items.push({
          title: <span className="font-medium text-slate-800 dark:text-slate-200">{fallbackItem.label}</span>
        });
      } else if (activePath === '/profile') {
        items.push({
          title: <span className="font-medium text-slate-800 dark:text-slate-200">{t('user_profile')}</span>
        });
      }
    }

    return items;
  }, [flatMenus, defaultSidebarItems, activePath, t]);

  const pageTitle = useMemo(() => {
    const activePathLower = activePath.toLowerCase();
    const currentMenuItem = flatMenus.find(
      (m) => m && m.url && m.url.toLowerCase() === activePathLower
    );
    if (currentMenuItem) {
      return translateMenuLabel(currentMenuItem.name, currentMenuItem.url);
    }
    const fallbackItem = getFallbackItem(defaultSidebarItems, activePath);
    if (fallbackItem) {
      return fallbackItem.label;
    }
    if (activePath === '/profile') {
      return t('user_profile');
    }
    return t('dashboard.home_title');
  }, [flatMenus, defaultSidebarItems, activePath, t]);

  useTitle(pageTitle, true);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

  return (
    <div className="pt-3 sm:pt-4 pl-3 sm:pl-4 flex flex-col gap-3 w-full h-[calc(100vh-56px)]">
      {activePath !== '/' && breadcrumbs.length > 1 && (
        <Breadcrumbs sx={{ fontSize: '12px' }} separator={<ChevronRight size={10} className="text-slate-400" />}>
          {breadcrumbs.map((item, idx) => (
            <span key={idx}>{item.title}</span>
          ))}
        </Breadcrumbs>
      )}

      <div key={activePath} ref={setScroller} className="flex-1 min-h-0 min-w-0 overflow-y-auto pr-3 sm:pr-4 pb-3 sm:pb-4 animate-page-fade-in page-scroll">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </div>
      <BackToTop scroller={scroller} />
    </div>
  );
};

export default DashboardFeature;

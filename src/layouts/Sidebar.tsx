import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Popper } from '@mui/material';
import { Tooltip } from '../components/ui';
import {
  Home,
  Settings,
  Shield,
  List,
  ChevronDown,
  Users,
  Building2,
  Mail,
  MenuIcon,
  Calendar,
  CalendarPlus,
  Archive,
  CheckSquare,
  BarChart3,
  Bell,
  Handshake,
  LayoutDashboard,
  CircleUser,
  FileCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import { COLORS } from '../constants';
import { ICON_MAP, getMenuIcon } from '../constants/iconRegistry';
import { cn } from '../utils/helpers';
import { useFlatMenusQuery } from '../hooks';
import { translateMenuLabel } from '../utils/helpers';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface SubMenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
}

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  children?: SubMenuItem[];
}

const isNavigable = (key: string) => !key.startsWith('menu-');
const toPath = (key: string) => (key.startsWith('/') ? key : `/${key}`);

const isPathActive = (a: string, b: string) => {
  const clean = (p: string) => p.toLowerCase().replace(/\/+$/, '') || '/';
  return clean(a) === clean(b);
};

interface SidebarMenuItemProps {
  item: MenuItem;
  collapsed: boolean;
  isActive: boolean;
  isExpanded: boolean;
  activeColor: string;
  activeBg: string;
  activeTab: string;
  onToggleExpand: (key: string) => void;
}

const SidebarMenuItemRow: React.FC<SidebarMenuItemProps> = ({
  item,
  collapsed,
  isActive,
  isExpanded,
  activeColor,
  activeBg,
  activeTab,
  onToggleExpand,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const openFlyout = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsHovered(true);
  };

  const scheduleCloseFlyout = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setIsHovered(false), 120);
  };

  const hasChildren = !!item.children && item.children.length > 0;
  const isFlyoutOpen = collapsed && hasChildren && isHovered;

  const rowClassName = `group h-10 flex items-center rounded-xl cursor-pointer overflow-hidden hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-[#0052CC] dark:hover:text-[#0EA5E9] no-underline ${
    isActive ? 'relative' : ''
  } ${
    collapsed ? 'justify-center px-0' : 'justify-between px-3'
  }`;
  const rowStyle = {
    backgroundColor: isActive ? activeBg : undefined,
    color: isActive ? activeColor : undefined,
    transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
  };
  const rowContent = (
    <>
      {isActive && (
        <div
          className="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-full"
          style={{ backgroundColor: activeColor }}
        />
      )}
      <div className={`flex items-center min-w-0 ${
        collapsed ? 'gap-0 justify-center w-full' : 'gap-3'
      }`}>
        <span
          className="flex items-center justify-center flex-shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-[#0052CC] dark:group-hover:text-[#0EA5E9] transition-colors"
          style={{ color: isActive ? activeColor : undefined }}
        >
          {item.icon}
        </span>
        <span
          className={`text-[13px] font-medium whitespace-nowrap select-none text-slate-600 dark:text-slate-400 group-hover:text-[#0052CC] dark:group-hover:text-[#0EA5E9] ${
            collapsed
              ? 'opacity-0 max-w-0 overflow-hidden pointer-events-none'
              : 'opacity-100 max-w-[12rem]'
          }`}
          style={{
            color: isActive ? activeColor : undefined,
            transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.45s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s ease',
          }}
        >
          {item.label}
        </span>
      </div>

      {hasChildren && !collapsed && (
        <ChevronDown
          size={14}
          className="flex-shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-[#0052CC] dark:group-hover:text-[#0EA5E9] transition-colors"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease, color 0.2s ease',
          }}
        />
      )}
    </>
  );

  const menuItemNode = hasChildren ? (
    <div
      onClick={() => {
        if (!collapsed) onToggleExpand(item.key);
      }}
      className={rowClassName}
      style={rowStyle}
    >
      {rowContent}
    </div>
  ) : isNavigable(item.key) ? (
    <Link to={toPath(item.key)} className={rowClassName} style={rowStyle}>
      {rowContent}
    </Link>
  ) : (
    <div className={rowClassName} style={rowStyle}>
      {rowContent}
    </div>
  );

  let contentNode = menuItemNode;

  if (collapsed) {
    if (hasChildren) {
      contentNode = (
        <div
          ref={rowRef}
          onMouseEnter={openFlyout}
          onMouseLeave={scheduleCloseFlyout}
        >
          {menuItemNode}
          <Popper
            open={!!isFlyoutOpen}
            anchorEl={rowRef.current}
            placement="right-start"
            className="!z-[1300]"
            modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
          >
            <div
              onMouseEnter={openFlyout}
              onMouseLeave={scheduleCloseFlyout}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl p-3 min-w-[200px] flex flex-col gap-1"
              style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08)' }}
            >
              <div className="px-3 py-1.5 font-bold text-sm text-slate-800 dark:text-slate-200">
                {item.label}
              </div>

              <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

              {item.children?.map((child) => {
                const isChildActive = isPathActive(activeTab, child.key);
                const childClassName = `group h-10 flex items-center gap-3 px-3 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-0 text-slate-600 dark:text-slate-400 hover:text-[#0052CC] dark:hover:text-[#0EA5E9] no-underline ${
                  isChildActive ? 'relative' : ''
                }`;
                const childStyle = {
                  backgroundColor: isChildActive ? activeBg : undefined,
                  color: isChildActive ? activeColor : undefined,
                };
                const childContent = (
                  <>
                    {isChildActive && (
                      <div
                        className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full"
                        style={{ backgroundColor: activeColor }}
                      />
                    )}
                    <span
                      className="flex items-center justify-center flex-shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-[#0052CC] dark:group-hover:text-[#0EA5E9] transition-colors"
                      style={{ color: isChildActive ? activeColor : undefined }}
                    >
                      {child.icon}
                    </span>
                    <span
                      className="text-[13px] font-medium truncate select-none text-slate-600 dark:text-slate-400 group-hover:text-[#0052CC] dark:group-hover:text-[#0EA5E9] transition-colors"
                      style={{ color: isChildActive ? activeColor : undefined }}
                      title={child.label}
                    >
                      {child.label}
                    </span>
                  </>
                );
                return isNavigable(child.key) ? (
                  <Link key={child.key} to={toPath(child.key)} className={childClassName} style={childStyle} onClick={() => setIsHovered(false)}>
                    {childContent}
                  </Link>
                ) : (
                  <div key={child.key} className={childClassName} style={childStyle}>
                    {childContent}
                  </div>
                );
              })}
            </div>
          </Popper>
        </div>
      );
    } else {
      contentNode = (
        <Tooltip title={item.tooltip} placement="right">
          {menuItemNode}
        </Tooltip>
      );
    }
  }

  return (
    <div>
      {contentNode}

      {hasChildren && !collapsed && (
        <div
          style={{
            maxHeight: isExpanded ? `${item.children!.length * 36}px` : '0px',
            opacity: isExpanded ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
          }}
        >
          {item.children!.map((child) => {
            const isChildActive = isPathActive(activeTab, child.key);
            const childClassName = `group h-9 flex items-center gap-2 rounded-xl cursor-pointer pl-9 pr-2 min-w-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 hover:text-[#0052CC] dark:hover:text-[#0EA5E9] no-underline ${
              isChildActive ? 'relative' : ''
            }`;
            const childStyle = {
              backgroundColor: isChildActive ? activeBg : undefined,
              color: isChildActive ? activeColor : undefined,
              transition: 'all 0.2s ease',
            };
            const childContent = (
              <>
                {isChildActive && (
                  <div
                    className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                    style={{ backgroundColor: activeColor }}
                  />
                )}
                <span
                  className="flex items-center justify-center flex-shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-[#0052CC] dark:group-hover:text-[#0EA5E9] transition-colors"
                  style={{ color: isChildActive ? activeColor : undefined }}
                >
                  {child.icon}
                </span>
                <span
                  className="text-xs font-medium truncate select-none text-slate-600 dark:text-slate-400 group-hover:text-[#0052CC] dark:group-hover:text-[#0EA5E9] transition-colors"
                  style={{ color: isChildActive ? activeColor : undefined }}
                  title={child.label}
                >
                  {child.label}
                </span>
              </>
            );
            return isNavigable(child.key) ? (
              <Link key={child.key} to={toPath(child.key)} className={childClassName} style={childStyle}>
                {childContent}
              </Link>
            ) : (
              <div key={child.key} className={childClassName} style={childStyle}>
                {childContent}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SidebarMenuItem = React.memo(SidebarMenuItemRow);

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname;
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const { themeMode } = useThemeStore();
  const { t } = useTranslation();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const getIcon = (iconName: string, size = 16) => {
    if (!iconName) return <Home size={size} />;

    const normalized = iconName
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    const IconComponent = getMenuIcon(normalized in ICON_MAP ? normalized : iconName);
    return <IconComponent size={size} />;
  };

  const normalizeMenuUrl = (url?: string | null): string | null => {
    const trimmed = (url || '').trim();
    if (!trimmed || trimmed === '#') return null;
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  };

  const buildMenuTree = (flatMenus: any[]): MenuItem[] => {
    if (!Array.isArray(flatMenus) || flatMenus.length === 0) return [];

    const activeMenus = flatMenus
      .filter((m) => m && m.isActive !== false)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    const menuMap: Record<string, MenuItem> = {};
    const roots: MenuItem[] = [];

    activeMenus.forEach((item) => {
      const menuUrl = normalizeMenuUrl(item.url) || `menu-${item.id}`;
      const translatedLabel = translateMenuLabel(item.name, menuUrl);
      menuMap[item.id] = {
        key: menuUrl,
        label: translatedLabel,
        tooltip: translatedLabel,
        icon: getIcon(item.icon, 16),
        children: [],
      };
    });

    activeMenus.forEach((item) => {
      const parentId = item.parentId;
      const mapped = menuMap[item.id];
      if (parentId && menuMap[parentId]) {
        menuMap[parentId].children?.push({
          key: mapped.key,
          label: mapped.label,
          icon: getIcon(item.icon, 14),
        } as any);
      } else {
        roots.push(mapped);
      }
    });

    roots.forEach((root) => {
      if (root.key === 'danh-muc' || root.key === '/danh-muc') {
        if (!root.children) root.children = [];
        const hasMeetingType = root.children.some((c) => c.key === '/danh-muc/loai-lich-hop');
        if (!hasMeetingType) {
          root.children.push({
            key: '/danh-muc/loai-lich-hop',
            label: t('categories_meeting_type'),
            icon: getIcon('calendar', 14),
          } as any);
        }
      }
      if (root.children && root.children.length === 0) {
        delete root.children;
      }
    });

    return roots;
  };

  const defaultSidebarItems: MenuItem[] = useMemo(() => [
    { key: '/', icon: <Home size={16} />, label: t('console'), tooltip: t('console') },
    {
      key: 'lich-lam-viec',
      icon: <Calendar size={16} />,
      label: t('nav_work_schedule'),
      tooltip: t('nav_work_schedule'),
      children: [
        { key: '/lich-lam-viec/ca-nhan', icon: <CircleUser size={14} />, label: t('work_schedule.personal_calendar') },
        { key: '/lich-lam-viec/dang-ky-lich-lanh-dao', icon: <CalendarPlus size={14} />, label: t('work_schedule.leadership_registration') },
        { key: '/lich-lam-viec/phe-duyet', icon: <FileCheck size={14} />, label: t('work_schedule.schedule_approval') },
        { key: '/lich-lam-viec/loi-moi-tham-du', icon: <Mail size={14} />, label: t('work_schedule.meeting_invitations') },
        { key: '/lich-lam-viec/tong-hop', icon: <LayoutDashboard size={14} />, label: t('work_schedule.overview') },
      ],
    },
    { key: '/tai-nguyen', icon: <Archive size={16} />, label: t('nav_resources'), tooltip: t('nav_resources') },
    { key: '/cong-viec', icon: <CheckSquare size={16} />, label: t('nav_tasks'), tooltip: t('nav_tasks') },
    { key: '/bao-cao', icon: <BarChart3 size={16} />, label: t('nav_reports'), tooltip: t('nav_reports') },
    { key: '/thong-bao', icon: <Bell size={16} />, label: t('nav_notifications'), tooltip: t('nav_notifications') },
    { key: '/danh-sach-uy-quyen', icon: <Handshake size={16} />, label: t('nav_delegation'), tooltip: t('nav_delegation') },
    {
      key: 'he-thong',
      icon: <Settings size={16} />,
      label: t('system'),
      tooltip: t('system'),
      children: [
        { key: '/he-thong/nhan-vien', icon: <Users size={14} />, label: t('system_employees') },
        { key: '/he-thong/vai-tro', icon: <Shield size={14} />, label: t('system_roles') },
        { key: '/he-thong/cau-hinh-menu', icon: <MenuIcon size={14} />, label: t('system_menu_config') },
        { key: '/he-thong/cau-hinh-mail', icon: <Mail size={14} />, label: t('system_mail_config') },
      ],
    },
    {
      key: 'danh-muc',
      icon: <List size={16} />,
      label: t('categories'),
      tooltip: t('categories'),
      children: [
        { key: '/danh-muc/don-vi-phong-ban', icon: <Building2 size={14} />, label: t('categories_department') },
        { key: '/danh-muc/loai-lich-hop', icon: <Calendar size={14} />, label: t('categories_meeting_type') },
      ],
    },
  ], [t]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: menuList = [], isLoading: menusLoading, isError: menusError } = useFlatMenusQuery();

  const menuItems: MenuItem[] = useMemo(() => {
    if (menuList && menuList.length > 0) return buildMenuTree(menuList);
    if (menusError) return defaultSidebarItems;
    return [];
  }, [menuList, menusError, defaultSidebarItems]);

  useEffect(() => {
    if (collapsed) return;
    setExpandedMenus((prev) => {
      const activeGroups: string[] = [];
      if (activeTab.startsWith('/he-thong/') && !prev.includes('he-thong')) {
        activeGroups.push('he-thong');
      }
      if (activeTab.startsWith('/danh-muc/') && !prev.includes('danh-muc')) {
        activeGroups.push('danh-muc');
      }
      return activeGroups.length > 0 ? [...prev, ...activeGroups] : prev;
    });
  }, [activeTab, collapsed]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedMenus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const activeColor = COLORS.primary.main;
  const activeBg = themeMode === 'dark' ? COLORS.primary.darkActive : COLORS.primary.light;

  const sidebarWidth = isMobile && collapsed ? '0rem' : collapsed ? '4rem' : '13.5rem';

  return (
    <aside
      className="h-screen sticky top-0 left-0 flex flex-col flex-shrink-0 bg-white dark:bg-slate-900 responsive-sidebar"
      style={{
        width: sidebarWidth,
        borderRight: themeMode === 'dark' ? `1px solid ${COLORS.theme.dark.border}` : `1px solid ${COLORS.theme.light.border}`,
        transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      <div
        className={cn(
          'h-14 flex items-center w-full shrink-0 border-b transition-all',
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}
        style={{
          borderBottom: themeMode === 'dark' ? `1px solid ${COLORS.theme.dark.border}` : `1px solid ${COLORS.theme.light.border}`,
        }}
      >
        {!collapsed && (
          <span
            onClick={() => navigate('/')}
            className="logo-shimmer cursor-pointer"
          >
            <img
              src="/images/logo-thaco.png"
              alt="THACO"
              className="h-8 max-w-[8.125rem] object-contain select-none hover:opacity-80 transition-all"
              style={{ filter: themeMode === 'dark' ? 'brightness(0) invert(1)' : 'none' }}
            />
          </span>
        )}
        <Tooltip title={collapsed ? (t('expand') || 'Mở rộng menu') : (t('collapse') || 'Thu gọn menu')} placement="right">
          <button
            type="button"
            onClick={onToggle}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0052CC] dark:hover:text-[#0EA5E9] transition-all border-0 bg-transparent cursor-pointer flex items-center justify-center shrink-0"
          >
            <MenuIcon size={20} />
          </button>
        </Tooltip>
      </div>

      <nav className={`flex flex-col gap-1 w-full pt-4 overflow-y-auto overflow-x-hidden flex-1 ${
        collapsed ? 'px-2' : 'px-3'
      }`}>
        {menusLoading && menuItems.length === 0 && (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-12 flex items-center rounded-xl animate-pulse ${
                  collapsed ? 'justify-center px-0' : 'px-4 gap-3'
                }`}
              >
                <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
                {!collapsed && (
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800" style={{ width: `${60 + (i % 3) * 15}%` }} />
                )}
              </div>
            ))}
          </div>
        )}
        {menuItems.map((item) => {
          const isActive = isPathActive(activeTab, item.key);
          const isExpanded = expandedMenus.includes(item.key);
          return (
            <SidebarMenuItem
              key={item.key}
              item={item}
              collapsed={collapsed}
              isActive={isActive}
              isExpanded={isExpanded}
              activeColor={activeColor}
              activeBg={activeBg}
              activeTab={activeTab}
              onToggleExpand={toggleExpand}
            />
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

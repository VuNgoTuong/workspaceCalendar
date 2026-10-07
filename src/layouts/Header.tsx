import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Menu as MuiMenu,
  MenuItem,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import { Tooltip, ThemeToggle } from '../components/ui';
import {
  Bell,
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  TimerOff,
  ChevronDown,
  Crown,
  User,
  LogOut,
  Menu as MenuIcon,
  Trash2,
  Mail,
  Search,
  Plus,
  Calendar,
  History,
  X,
  RefreshCw,
  CheckCircle,
  ChevronRight,
  Building2,
  ShieldCheck,
  FileCheck,
  UserPlus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../store/authStore';
import { useActingLeaderStore } from '../store/actingLeaderStore';
import { useThemeStore } from '../store/themeStore';
import { toast } from '../store/toastStore';
import { switchLanguage } from '../i18n';
import { cn, formatRelativeTime, resolveAttachmentUrl } from '../utils/helpers';
import { GreetingBadge } from '../features/dashboard/components/GreetingBadge';
import { HEADER_QUICK_ACTIONS } from '../constants/quickActions';
import { useFlatMenusQuery, hasMenuPermission } from '../hooks';
import {
  useNotificationsQuery,
  useUnreadNotificationsQuery,
  useTotalUnreadCountQuery,
  useMarkAsReadMutation,
  useBulkSeenMutation,
  useDeleteNotificationMutation,
  useBulkDeleteNotificationsMutation,
} from '../hooks/useNotificationQueries';
import { useSignalR } from '../hooks/useSignalR';
import type { INotification } from '../services/api/notificationAPI';
import { getNotificationDisplay, extractNotificationTargetId, extractNotificationScheduleCategory, parseNotificationContent, normalizeNotificationCode, NOTIFICATION_CODES } from '../constants/notificationCodes';
import { ScheduleCategory } from '../constants/scheduleCategory';

const VietnamFlag: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 3 2"
    style={{ width: '18px', height: '12px' }}
    className={`rounded-xs border border-slate-200 dark:border-slate-700 select-none block shrink-0 ${className}`}
  >
    <rect width="3" height="2" fill="#da251d" />
    <polygon
      points="1.5,0.4 1.62,0.85 2.1,0.85 1.71,1.13 1.86,1.6 1.5,1.3 1.14,1.6 1.29,1.13 0.9,0.85 1.38,0.85"
      fill="#ffff00"
    />
  </svg>
);

const UKFlag: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 60 30"
    style={{ width: '18px', height: '12px' }}
    className={`rounded-xs border border-slate-200 dark:border-slate-700 select-none block shrink-0 ${className}`}
  >
    <rect width="60" height="30" fill="#012169" />
    <path d="M0,0 L60,30 M0,30 L60,0" stroke="#fff" strokeWidth="6" />
    <path d="M0,0 L60,30 M0,30 L60,0" stroke="#c8102e" strokeWidth="4" />
    <path d="M0,15 L60,15 M30,0 L30,30" stroke="#fff" strokeWidth="10" />
    <path d="M0,15 L60,15 M30,0 L30,30" stroke="#c8102e" strokeWidth="6" />
  </svg>
);

interface HeaderProps {
  sidebarCollapsed: boolean;
  onToggle: () => void;
}

const getNotificationTheme = (title: string, code?: string) => {
  const c = code?.toLowerCase() || '';
  const t = title.toLowerCase();

  // Success / Approval
  if (
    c.includes('approved') ||
    t.includes('duyệt') ||
    t.includes('đồng ý') ||
    t.includes('chấp nhận') ||
    t.includes('approved')
  ) {
    return 'success';
  }

  // Rejection / Cancelled / Error
  if (
    c.includes('rejected') ||
    c.includes('cancelled') ||
    t.includes('từ chối') ||
    t.includes('hủy') ||
    t.includes('rejected') ||
    t.includes('cancelled')
  ) {
    return 'danger';
  }

  // Warning / Expiring
  if (
    c.includes('warning') ||
    c.includes('expire') ||
    t.includes('sắp hết hạn') ||
    t.includes('hết hạn') ||
    t.includes('warning') ||
    t.includes('cảnh báo')
  ) {
    return 'warning';
  }

  // Invitation / Delegation
  if (
    c.includes('invited') ||
    c.includes('delegation') ||
    t.includes('lời mời') ||
    t.includes('mời tham dự') ||
    t.includes('ủy quyền') ||
    t.includes('invitation') ||
    t.includes('invite')
  ) {
    return 'invitation';
  }

  // Update / Created / Info
  if (
    c.includes('updated') ||
    c.includes('created') ||
    t.includes('cập nhật') ||
    t.includes('đăng ký') ||
    t.includes('tạo') ||
    t.includes('update')
  ) {
    return 'info';
  }

  return 'general';
};

// Rounded tiles with a soft gradient + inner ring, matching the dashboard's tile language.
const NOTIFICATION_ICON_STYLE: Record<
  ReturnType<typeof getNotificationTheme>,
  { icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; tile: string }
> = {
  success: {
    icon: CalendarCheck2,
    tile: 'from-emerald-50 to-emerald-100/70 text-emerald-600 ring-emerald-200/60 dark:from-emerald-950/60 dark:to-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800/50',
  },
  danger: {
    icon: CalendarX2,
    tile: 'from-rose-50 to-rose-100/70 text-rose-500 ring-rose-200/60 dark:from-rose-950/60 dark:to-rose-900/30 dark:text-rose-400 dark:ring-rose-800/50',
  },
  warning: {
    icon: TimerOff,
    tile: 'from-amber-50 to-orange-100/60 text-amber-600 ring-amber-200/60 dark:from-amber-950/60 dark:to-orange-900/30 dark:text-amber-400 dark:ring-amber-800/50',
  },
  invitation: {
    icon: Mail,
    tile: 'from-amber-50 to-amber-100/70 text-amber-600 ring-amber-200/60 dark:from-amber-950/60 dark:to-amber-900/30 dark:text-amber-400 dark:ring-amber-800/50',
  },
  info: {
    icon: CalendarClock,
    tile: 'from-blue-50 to-sky-100/70 text-[#00529C] ring-blue-200/60 dark:from-blue-950/60 dark:to-sky-900/30 dark:text-blue-400 dark:ring-blue-800/50',
  },
  general: {
    icon: Bell,
    tile: 'from-slate-50 to-slate-100 text-slate-500 ring-slate-200/70 dark:from-slate-800 dark:to-slate-800/60 dark:text-slate-400 dark:ring-slate-700/60',
  },
};

const renderNotificationIcon = (title: string, code?: string) => {
  const { icon: Icon, tile } = NOTIFICATION_ICON_STYLE[getNotificationTheme(title, code)];
  return (
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ring-1 ring-inset flex items-center justify-center shrink-0 ${tile}`}>
      <Icon size={17} strokeWidth={2.1} />
    </div>
  );
};

interface ISmartCommand {
  id: string;
  titleKey: string;
  subtitleKey?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  keywords: string[];
  action: (navigate: any) => void;
}

const SMART_COMMANDS: ISmartCommand[] = [
  {
    id: 'create-schedule',
    titleKey: 'header.cmd_create_schedule_title',
    subtitleKey: 'header.cmd_create_schedule_subtitle',
    icon: Plus,
    keywords: ['tạo', 'tao', 'đăng ký', 'dang ky', 'lịch mới', 'lich moi', 'thêm mới', 'create', 'new schedule'],
    action: (navigate) => navigate('/lich-lam-viec/ca-nhan', { state: { autoOpenCreate: true } }),
  },
  {
    id: 'leader-overview',
    titleKey: 'header.cmd_leader_overview_title',
    subtitleKey: 'header.cmd_leader_overview_subtitle',
    icon: Crown,
    keywords: ['lãnh đạo', 'lanh dao', 'sếp', 'sep', 'tổng hợp', 'tong hop', 'công tác', 'leader', 'overview'],
    action: (navigate) => navigate('/lich-lam-viec/tong-hop'),
  },
  {
    id: 'approval',
    titleKey: 'header.cmd_approval_title',
    subtitleKey: 'header.cmd_approval_subtitle',
    icon: FileCheck,
    keywords: ['duyệt', 'duyet', 'phê duyệt', 'phe duyet', 'xét duyệt', 'approve', 'approval'],
    action: (navigate) => navigate('/lich-lam-viec/phe-duyet'),
  },
  {
    id: 'invitations',
    titleKey: 'header.cmd_invitations_title',
    subtitleKey: 'header.cmd_invitations_subtitle',
    icon: UserPlus,
    keywords: ['lời mời', 'loi moi', 'mời', 'moi', 'tham dự', 'invitation', 'invite'],
    action: (navigate) => navigate('/lich-lam-viec/loi-moi-tham-du'),
  },
  {
    id: 'meeting-rooms',
    titleKey: 'header.cmd_meeting_rooms_title',
    subtitleKey: 'header.cmd_meeting_rooms_subtitle',
    icon: Building2,
    keywords: ['phòng họp', 'phong hop', 'danh mục', 'danh muc', 'đặt phòng', 'meeting room', 'room'],
    action: (navigate) => navigate('/danh-muc/phong-hop'),
  },
  {
    id: 'delegation',
    titleKey: 'header.cmd_delegation_title',
    subtitleKey: 'header.cmd_delegation_subtitle',
    icon: ShieldCheck,
    keywords: ['ủy quyền', 'uy quyen', 'ủy thác', 'delegation', 'delegate'],
    action: (navigate) => navigate('/he-thong/uy-quyen'),
  },
];

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 5;

const SEARCH_SHORTCUTS = [
  { icon: Crown, labelKey: 'header.search_suggestion_leader_calendar', defaultLabel: 'Tổng hợp lịch lãnh đạo', path: '/lich-lam-viec/tong-hop' },
  { icon: Calendar, labelKey: 'header.search_suggestion_my_calendar', defaultLabel: 'Lịch cá nhân của tôi', path: '/lich-lam-viec/ca-nhan' },
];

export const Header: React.FC<HeaderProps> = ({ sidebarCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null);
  const [createMenuAnchor, setCreateMenuAnchor] = useState<HTMLElement | null>(null);
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [notifPageSize, setNotifPageSize] = useState(20);
  const notifListRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore(useShallow((s) => ({ user: s.user, logout: s.logout })));
  const { actingLeader, availableLeaders, setActingLeader, clearActingLeader } = useActingLeaderStore(
    useShallow((s) => ({
      actingLeader: s.actingLeader,
      availableLeaders: s.availableLeaders,
      setActingLeader: s.setActingLeader,
      clearActingLeader: s.clearActingLeader,
    }))
  );
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark';
  const { t, i18n } = useTranslation();

  const { data: menuList = [] } = useFlatMenusQuery();

  const allowedHeaderQuickActions = useMemo(() => {
    if (!menuList || menuList.length === 0) return HEADER_QUICK_ACTIONS;
    return HEADER_QUICK_ACTIONS.filter((action) => hasMenuPermission(menuList, action.path));
  }, [menuList]);

  const currentLang = i18n.language || 'vi';

  const [searchValue, setSearchValue] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rawQuery = searchValue.trim();
  const isSearching = rawQuery.length > 0;

  const matchingCommands = useMemo(() => {
    if (!rawQuery) return [];
    const q = rawQuery.toLowerCase();
    return SMART_COMMANDS.filter(
      (cmd) =>
        t(cmd.titleKey).toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.includes(q) || q.includes(kw))
    );
  }, [rawQuery, t]);

  const smartNavigateByQuery = (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return;

    if (
      q.includes('lãnh đạo') ||
      q.includes('lanh dao') ||
      q.includes('tổng hợp') ||
      q.includes('tong hop') ||
      q.includes('đăng ký') ||
      q.includes('dang ky') ||
      q.includes('phê duyệt') ||
      q.includes('phe duyet') ||
      q.includes('sếp')
    ) {
      navigate('/lich-lam-viec/tong-hop', { state: { prefillSearch: query } });
      return;
    }

    if (
      q.includes('nhân viên') ||
      q.includes('nhan vien') ||
      q.includes('nhân sự') ||
      q.includes('nhan su') ||
      q.includes('phòng ban') ||
      q.includes('phong ban') ||
      q.includes('người') ||
      q.includes('nguoi') ||
      q.includes('user') ||
      q.includes('employee')
    ) {
      navigate('/he-thong/nhan-vien', { state: { prefillSearch: query } });
      return;
    }

    if (q.includes('lời mời') || q.includes('loi moi') || q.includes('mời') || q.includes('moi')) {
      navigate('/lich-lam-viec/loi-moi-tham-du', { state: { prefillSearch: query } });
      return;
    }

    if (q.includes('phòng họp') || q.includes('phong hop')) {
      navigate('/danh-muc/phong-hop', { state: { prefillSearch: query } });
      return;
    }

    if (q.includes('ủy quyền') || q.includes('uy quyen')) {
      navigate('/he-thong/uy-quyen', { state: { prefillSearch: query } });
      return;
    }

    navigate('/lich-lam-viec/ca-nhan', { state: { prefillSearch: query } });
  };

  const commitSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
    setSearchValue(trimmed);
  };

  const handleRemoveRecentSearch = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const next = prev.filter((item) => item !== query);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const goToShortcut = (path: string) => {
    setSearchOpen(false);
    navigate(path);
  };

  useSignalR();

  const { data: totalUnread = 0 } = useTotalUnreadCountQuery();

  const allNotificationsQuery = useNotificationsQuery({ PageNumber: 1, PageSize: notifPageSize }, activeTab === 'all');
  const unreadNotificationsQuery = useUnreadNotificationsQuery(activeTab === 'unread');

  const handleViewAllNotifications = () => {
    if (activeTab !== 'all') {
      setActiveTab('all');
    }
    setNotifPageSize((prev) => Math.min(prev + 30, 100));
    setTimeout(() => {
      if (notifListRef.current) {
        notifListRef.current.scrollTo({ top: notifListRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, 100);
  };

  const notifications =
    activeTab === 'all' ? allNotificationsQuery.data?.items ?? [] : unreadNotificationsQuery.data ?? [];
  const isLoadingNotifications =
    activeTab === 'all' ? allNotificationsQuery.isLoading : unreadNotificationsQuery.isLoading;

  const markAsReadMutation = useMarkAsReadMutation();
  const bulkSeenMutation = useBulkSeenMutation();
  const deleteNotificationMutation = useDeleteNotificationMutation();
  const bulkDeleteMutation = useBulkDeleteNotificationsMutation();

  const handleNotificationItemClick = (notification: INotification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    setNotifAnchor(null);

    const targetId = extractNotificationTargetId(notification.content);
    const code = normalizeNotificationCode(notification.code);

    if (code.includes('delegation')) {
      const url = '/danh-sach-uy-quyen' + (targetId ? `?id=${encodeURIComponent(targetId)}` : '');
      navigate(url);
      return;
    }

    let basePath = '/lich-lam-viec/tong-hop';
    if (
      code === normalizeNotificationCode(NOTIFICATION_CODES.ApproveInvitationSchedule) ||
      code === normalizeNotificationCode(NOTIFICATION_CODES.RejectInvitationSchedule)
    ) {
      basePath =
        extractNotificationScheduleCategory(notification.content) === ScheduleCategory.LeaderRegistration
          ? '/lich-lam-viec/dang-ky-lich-lanh-dao'
          : '/lich-lam-viec/ca-nhan';
    } else if (code.includes('invitation') || code.includes('invited')) {
      basePath = '/lich-lam-viec/loi-moi-tham-du';
    } else if (code.includes('leader-registration') || code.includes('approval')) {
      basePath = '/lich-lam-viec/phe-duyet';
    } else if (code.includes('personal')) {
      const params = parseNotificationContent(notification.content);
      const ownerFullName = params.OwnerFullName || params.ownerFullName;
      basePath = ownerFullName ? '/lich-lam-viec/loi-moi-tham-du' : '/lich-lam-viec/ca-nhan';
    }

    const query = new URLSearchParams();
    if (targetId) query.set('id', targetId);
    if (
      targetId &&
      basePath === '/lich-lam-viec/ca-nhan' &&
      code === normalizeNotificationCode(NOTIFICATION_CODES.RejectInvitationSchedule)
    ) {
      query.set('section', 'participants');
    }
    const qs = query.toString();
    navigate(qs ? `${basePath}?${qs}` : basePath);
  };

  const handleDeleteNotification = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    deleteNotificationMutation.mutate(id);
  };

  const initials = user?.name ? (user.name.split(' ').pop()?.substring(0, 2).toUpperCase() || '') : '';

  return (
    <Box
      component="header"
      className="flex items-center gap-4 h-14 px-4 sm:px-6 sticky top-0 z-[35] w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300"
    >
      <IconButton onClick={onToggle} className="lg:!hidden !text-slate-500 dark:!text-slate-400 shrink-0">
        <MenuIcon size={18} />
      </IconButton>

      {sidebarCollapsed && (
        <span
          onClick={() => navigate('/')}
          className="logo-shimmer shrink-0 mr-1 cursor-pointer"
        >
          <img
            src="/images/logo-thaco.png"
            alt="THACO"
            className="h-7 max-w-[7rem] object-contain select-none hover:opacity-80 transition-all"
            style={{ filter: themeMode === 'dark' ? 'brightness(0) invert(1)' : 'none' }}
          />
        </span>
      )}

      <Box className="hidden xl:flex flex-col leading-tight shrink-0">
        <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-800 dark:text-slate-100">
          {t('header.greeting', { name: user?.name || '' })}
          <GreetingBadge />
        </span>
        <span className="text-[11.5px] text-slate-400 dark:text-slate-500">{t('header.greeting_subtitle')}</span>
      </Box>

      {/* Search */}
      <Box ref={searchWrapperRef} className="flex-1 min-w-0 hidden md:flex justify-center px-2 relative">
        <TextField
          inputRef={searchInputRef}
          size="small"
          fullWidth
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const trimmed = searchValue.trim();
              if (trimmed) {
                commitSearch(trimmed);
                smartNavigateByQuery(trimmed);
                setSearchOpen(false);
              }
            }
            if (e.key === 'Escape') setSearchOpen(false);
          }}
          placeholder={t('header.search_placeholder')}
          className="max-w-xl rounded-full overflow-hidden"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} className={searchOpen ? 'text-[#00529C] dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'} />
                </InputAdornment>
              ),
              endAdornment: searchValue && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchValue('')} className="!p-1">
                    <X size={14} className="text-slate-400 dark:text-slate-400" />
                  </IconButton>
                </InputAdornment>
              ),
              className: '!rounded-full !text-xs transition-all duration-200 text-slate-800 dark:!text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-400',
            },
          }}
          sx={{
            '& .MuiInputBase-input, & .MuiOutlinedInput-input': {
              backgroundColor: 'transparent !important',
              color: isDark ? '#f8fafc !important' : '#0f172a !important',
            },
            '& input:-webkit-autofill': {
              WebkitBoxShadow: isDark ? '0 0 0 1000px #111a2e inset !important' : '0 0 0 1000px #f1f5f9 inset !important',
              WebkitTextFillColor: isDark ? '#f8fafc !important' : '#0f172a !important',
              caretColor: isDark ? '#f8fafc' : '#0f172a',
              transition: 'background-color 5000s ease-in-out 0s',
            },
            '& .MuiOutlinedInput-root': {
              borderRadius: '9999px !important',
              overflow: 'hidden',
              backgroundColor: isDark ? '#111a2e !important' : '#f1f5f9 !important',
              transition: 'all 0.2s ease',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? 'rgba(51, 65, 85, 0.7) !important' : 'rgba(203, 213, 225, 0.8) !important',
                transition: 'all 0.2s ease',
                borderRadius: '9999px !important',
              },
              '&:hover': {
                backgroundColor: isDark ? '#16223b !important' : '#e2e8f0 !important',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? 'rgba(96, 165, 250, 0.4) !important' : 'rgba(0, 82, 156, 0.35) !important',
                },
              },
              '&.Mui-focused': {
                backgroundColor: isDark ? '#182642 !important' : '#ffffff !important',
                boxShadow: isDark ? '0 0 0 3px rgba(59, 130, 246, 0.15) !important' : '0 0 0 3px rgba(0, 82, 156, 0.12) !important',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? '#3b82f6 !important' : '#00529C !important',
                  borderWidth: '1px !important',
                },
              },
            },
          }}
        />

        {searchOpen && (
          <div className="absolute top-[calc(100%+8px)] left-2 right-2 max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-30 p-2 overflow-hidden max-h-[70vh] overflow-y-auto">
            {!isSearching ? (
              <>
                {recentSearches.length > 0 && (
                  <div className="mb-1">
                    <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      {t('header.search_recent')}
                    </div>
                    {recentSearches.map((item) => (
                      <div
                        key={item}
                        onClick={() => commitSearch(item)}
                        className="group flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <History size={14} className="text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{item}</span>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveRecentSearch(e, item)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity border-0 bg-transparent cursor-pointer text-slate-400 hover:text-red-500 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    {t('header.search_quick_suggestions')}
                  </div>
                  {SEARCH_SHORTCUTS.map((s) => (
                    <div
                      key={s.path}
                      onClick={() => goToShortcut(s.path)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <s.icon size={14} className="text-[#00529C] dark:text-blue-400 shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{t(s.labelKey, s.defaultLabel)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : matchingCommands.length > 0 ? (
              <div className="py-1">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                  {t('header.search_nav_suggestions')}
                </div>
                {matchingCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    onClick={() => {
                      commitSearch(t(cmd.titleKey));
                      cmd.action(navigate);
                      setSearchOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer hover:bg-blue-50/70 dark:hover:bg-blue-950/40 transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-900/40 mb-1 group"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#00529C] dark:text-blue-400 shrink-0">
                      <cmd.icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-13 font-semibold text-slate-800 dark:text-slate-100 group-hover:text-[#00529C] dark:group-hover:text-blue-400 transition-colors">
                        {t(cmd.titleKey)}
                      </div>
                      {cmd.subtitleKey && (
                        <div className="text-11 text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {t(cmd.subtitleKey)}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => {
                  commitSearch(rawQuery);
                  smartNavigateByQuery(rawQuery);
                  setSearchOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <Search size={15} className="text-[#00529C] dark:text-blue-400 shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  {t('header.search_for')} <strong className="text-[#00529C] dark:text-blue-400">"{rawQuery}"</strong>
                </span>
                <ChevronRight size={14} className="text-slate-400 ml-auto shrink-0" />
              </div>
            )}
          </div>
        )}
      </Box>

      {/* Right utilities */}
      <Box className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
        {allowedHeaderQuickActions.length > 0 && (
          <>
            <button
              type="button"
              onClick={(e) => setCreateMenuAnchor(e.currentTarget)}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 border-0 bg-gradient-to-b from-[#2E8BE6] to-[#1F78D6] text-white text-[13px] font-semibold shadow-[0_1px_2px_rgba(15,60,120,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#2580DC] hover:to-[#196ECB] hover:shadow-[0_4px_10px_-2px_rgba(15,60,120,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] active:scale-[0.97] transition-all duration-200 cursor-pointer outline-none select-none shrink-0"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">{t('header.create_new')}</span>
            </button>
            <MuiMenu
              anchorEl={createMenuAnchor}
              open={!!createMenuAnchor}
              onClose={() => setCreateMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: {
                  className: '!rounded-2xl !mt-[15px] !min-w-[240px] !shadow-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0b1329]'
                },
                list: { className: '!p-1.5' },
              }}
            >
              {allowedHeaderQuickActions.map((action) => {
                const isAmber = action.tone === 'amber';
                return (
                  <MenuItem
                    key={action.key}
                    onClick={() => {
                      setCreateMenuAnchor(null);
                      navigate(action.path, action.state ? { state: action.state } : undefined);
                    }}
                    className={cn(
                      '!rounded-lg !gap-2.5 !min-h-0 !py-1.5 !px-2 !text-[13px] !font-medium !text-slate-700 dark:!text-slate-200',
                      isAmber
                        ? 'hover:!bg-amber-50/60 dark:hover:!bg-amber-950/40'
                        : 'hover:!bg-blue-50/60 dark:hover:!bg-blue-950/40'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-sm',
                        isAmber
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-500/30'
                          : 'bg-gradient-to-br from-[#1273CC] to-[#00529C] shadow-[#00529C]/30'
                      )}
                    >
                      <action.icon size={14} />
                    </span>
                    {t(action.labelKey)}
                  </MenuItem>
                );
              })}
            </MuiMenu>
          </>
        )}

        <ThemeToggle />


        <Tooltip title={t('notifications_dropdown.title')}>
          <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} className="!text-slate-500 dark:!text-slate-400">
            <Badge
              badgeContent={totalUnread}
              max={99}
              slotProps={{
                badge: {
                  className:
                    '!min-w-[18px] !h-[18px] !px-1 !rounded-full !bg-rose-500 !text-white !text-[10px] !font-semibold !leading-none tabular-nums ring-2 ring-white dark:ring-slate-900',
                },
              }}
            >
              <Bell size={20} />
            </Badge>
          </IconButton>
        </Tooltip>
        <Popover
          open={!!notifAnchor}
          anchorEl={notifAnchor}
          onClose={() => setNotifAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              className:
                '!rounded-2xl !mt-3 !shadow-2xl !overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0b1329]',
            },
          }}
        >
          <div className="bg-white dark:bg-[#0b1329] w-[420px] overflow-hidden flex flex-col select-none">
            <div className="p-4 px-5 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#0369C9] dark:text-blue-400 font-semibold text-[14.5px]">
                  <Bell size={16} />
                  <span>{t('notifications_dropdown.title')}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-normal">
                  <span
                    onClick={() => bulkSeenMutation.mutate()}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#00529C] transition-colors"
                  >
                    <CheckCircle size={14} />
                    {t('notifications_dropdown.read_all')}
                  </span>
                  <span
                    onClick={() => bulkDeleteMutation.mutate()}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                    {t('notifications_dropdown.delete_all')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all border-0 cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-blue-50 text-[#00529C] dark:bg-blue-950/60 dark:text-blue-300'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t('notifications_dropdown.all')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('unread')}
                  className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all border-0 cursor-pointer ${
                    activeTab === 'unread'
                      ? 'bg-blue-50 text-[#00529C] dark:bg-blue-950/60 dark:text-blue-300'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t('notifications_dropdown.unread')}
                </button>
              </div>
            </div>

            <Divider className="!border-slate-100 dark:!border-slate-800/80" />

            <div ref={notifListRef} className="max-h-[380px] overflow-y-auto">
              {isLoadingNotifications ? (
                <div className="py-12 flex items-center justify-center">
                  <CircularProgress size={22} />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center px-4">
                  <Bell size={28} className="text-slate-300 dark:text-slate-700 mb-2" />
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    {t('notifications_dropdown.no_new')}
                  </span>
                </div>
              ) : (
                notifications.map((notification) => {
                  const display = getNotificationDisplay(t, notification.code, notification.title, notification.content);
                  const isUnread = !notification.isRead;
                  const isDangerTheme = getNotificationTheme(display.title, notification.code) === 'danger';
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationItemClick(notification)}
                      className={`group flex items-center gap-3.5 px-4 py-3 min-h-[74px] cursor-pointer transition-colors duration-150 border-b border-slate-100 dark:border-slate-800/40 last:border-b-0 hover:bg-slate-50/70 dark:hover:bg-blue-500/10 ${
                        isUnread && isDangerTheme
                          ? 'bg-rose-50/25 dark:bg-rose-950/10'
                          : isUnread
                          ? 'bg-blue-50/20 dark:bg-blue-950/10'
                          : ''
                      }`}
                    >
                      {renderNotificationIcon(display.title, notification.code)}

                      <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[42px]">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="text-13 font-medium text-slate-800 dark:text-slate-100 truncate leading-snug">
                            {display.title}
                          </h5>
                          <span className="text-10 text-slate-400 dark:text-slate-500 shrink-0 font-normal">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <Tooltip title={display.message} enterDelay={300} slotProps={{ tooltip: { className: 'premium-tooltip-mui' } }}>
                          <p className="text-11.5 text-slate-500 dark:text-slate-400 font-normal leading-relaxed line-clamp-2 mt-0.5">
                            {display.message}
                          </p>
                        </Tooltip>
                      </div>

                      <div className="flex items-center justify-center w-5 h-5 shrink-0 self-center ml-1 relative">
                        {isUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 group-hover:opacity-0 transition-opacity duration-200" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotification(e, notification.id)}
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 border-0 bg-transparent cursor-pointer text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/80 py-3 text-center bg-white dark:bg-[#0b1329]">
              <button
                type="button"
                onClick={handleViewAllNotifications}
                disabled={allNotificationsQuery.isFetching}
                className="text-xs font-semibold text-[#00529C] dark:text-blue-400 cursor-pointer hover:underline border-0 bg-transparent inline-flex items-center gap-1.5"
              >
                {allNotificationsQuery.isFetching && <CircularProgress size={12} />}
                <span>{t('notifications_dropdown.view_all')}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </Popover>

        <Divider orientation="vertical" flexItem className="!mx-0.5 !h-7 !self-center" />

        <Box
          onClick={(e) => setUserMenuAnchor(e.currentTarget)}
          className={`flex items-center gap-2.5 cursor-pointer py-1 px-2 sm:px-2.5 rounded-full transition-all duration-200 select-none ${
            actingLeader
              ? 'bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 shadow-xs hover:bg-blue-100/80 dark:hover:bg-blue-900/60'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="relative shrink-0">
            <Avatar
              src={resolveAttachmentUrl(user?.avatarUrl)}
              slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
              className={`!w-9 !h-9 !text-[13px] !font-medium border ${
                actingLeader ? 'border-[#00529C] dark:border-blue-400' : 'border-slate-200 dark:border-slate-700'
              }`}
              sx={{
                bgcolor: themeMode === 'dark' ? '#334155' : '#f1f5f9',
                color: themeMode === 'dark' ? '#cbd5e1' : '#475569',
              }}
            >
              {initials}
            </Avatar>
            {actingLeader && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00529C] text-white shadow-xs dark:bg-blue-500">
                <Crown size={9} />
              </span>
            )}
          </div>
          <Box className="hidden sm:block leading-tight">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
              {user?.name || ''}
            </div>
            {actingLeader && (
              <div className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[#00529C] dark:text-blue-300 truncate max-w-[170px] mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00529C] dark:bg-blue-400 shrink-0 animate-pulse" />
                <span className="truncate">{t('header.acting_as', { name: actingLeader.fullname })}</span>
              </div>
            )}
          </Box>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 shrink-0 ${
              actingLeader ? 'text-[#00529C] dark:text-blue-400 font-bold' : 'text-slate-400'
            } ${userMenuAnchor ? 'rotate-180' : ''}`}
          />
        </Box>
        <MuiMenu
          anchorEl={userMenuAnchor}
          open={!!userMenuAnchor}
          onClose={() => setUserMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { className: '!rounded-2xl !mt-2 !min-w-[240px] !shadow-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0b1329] text-slate-800 dark:text-slate-200' } }}
        >
          <Box className="px-3.5 py-2.5">
            <Typography className="!font-medium !text-slate-800 dark:!text-slate-200 !text-sm">{user?.name || ''}</Typography>
            <Typography className="!text-[12.5px] !font-light !text-slate-400 dark:!text-slate-500 !truncate !mt-0.5">{user?.email || ''}</Typography>
          </Box>
          {actingLeader && (
            <Box className="mx-2 mb-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 px-3 py-2.5 flex items-center gap-2.5">
              <Avatar
                src={resolveAttachmentUrl(actingLeader.avatarUrl)}
                slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                className="!w-8 !h-8 !text-[11.5px] !font-medium"
                sx={{ bgcolor: '#00529C', color: '#fff' }}
              >
                {actingLeader.fullname
                  .trim()
                  .split(/\s+/)
                  .slice(-2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </Avatar>
              <Box className="min-w-0">
                <Typography className="!text-[11px] !font-semibold !text-[#00529C] dark:!text-blue-400">
                  {t('header.acting_badge')}
                </Typography>
                <Typography className="!text-[13px] !font-medium !text-slate-800 dark:!text-slate-100 !truncate">
                  {actingLeader.fullname}
                </Typography>
                {actingLeader.positionName && (
                  <Typography className="!text-[11px] !font-light !text-slate-500 dark:!text-slate-400 !truncate">
                    {actingLeader.positionName}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
          {availableLeaders.length > 0 && (
            <Box className="mx-2 mb-2">
              <Box
                onClick={() => setSwitcherOpen((v) => !v)}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 cursor-pointer text-[#00529C] dark:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 transition-colors"
              >
                <span className="flex items-center gap-1.5 text-[12px] font-medium">
                  <RefreshCw size={12} />
                  {actingLeader ? t('header.switch_leader') : t('header.switch_to_delegated')}
                </span>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${switcherOpen ? 'rotate-180' : ''}`}
                />
              </Box>
              {switcherOpen && (
                <Box className="mt-1 flex flex-col gap-0.5 max-h-[176px] overflow-y-auto">
                  {actingLeader && (
                    <Box
                      onClick={() => {
                        clearActingLeader();
                        setSwitcherOpen(false);
                        setUserMenuAnchor(null);
                        toast.success(
                          t('header.toast_switch_personal_success', {
                            defaultValue: 'Đã chuyển về tài khoản cá nhân',
                          })
                        );
                      }}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/40 transition-colors"
                    >
                      <Avatar
                        src={resolveAttachmentUrl(user?.avatarUrl)}
                        slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                        className="!w-7 !h-7 !text-[10.5px] !font-medium"
                        sx={{ bgcolor: '#00529C', color: '#fff' }}
                      >
                        {user?.name
                          ?.trim()
                          .split(/\s+/)
                          .slice(-2)
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase() || 'ME'}
                      </Avatar>
                      <Box className="min-w-0">
                        <Typography className="!text-[12.5px] !font-medium !text-slate-700 dark:!text-slate-200 !truncate">
                          {user?.name || t('header.personal_account')} 
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  {availableLeaders
                    .filter((leader) => !actingLeader || leader.id !== actingLeader.id)
                    .map((leader) => (
                      <Box
                        key={leader.id}
                        onClick={() => {
                          setActingLeader(leader);
                          setSwitcherOpen(false);
                          setUserMenuAnchor(null);
                          toast.success(
                            t('header.toast_switch_leader_success', {
                              name: leader.fullname,
                              defaultValue: `Đã chuyển sang tài khoản ủy quyền: ${leader.fullname}`,
                            })
                          );
                        }}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <Avatar
                          src={resolveAttachmentUrl(leader.avatarUrl)}
                          slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                          className="!w-7 !h-7 !text-[10.5px] !font-medium"
                          sx={{ bgcolor: '#64748b', color: '#fff' }}
                        >
                          {leader.fullname
                            .trim()
                            .split(/\s+/)
                            .slice(-2)
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </Avatar>
                        <Box className="min-w-0">
                          <Typography className="!text-[12.5px] !font-medium !text-slate-700 dark:!text-slate-200 !truncate">
                            {leader.fullname}
                          </Typography>
                          {leader.positionName && (
                            <Typography className="!text-[10.5px] !font-light !text-slate-400 dark:!text-slate-500 !truncate">
                              {leader.positionName}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                </Box>
              )}
            </Box>
          )}
          <Divider className="!my-1 dark:!border-slate-800/80" />
          <MenuItem
            onClick={() => {
              setUserMenuAnchor(null);
              navigate('/profile');
            }}
            className="!gap-2.5 !py-2.5 !px-3.5 !mx-2 !rounded-xl text-slate-700 dark:text-slate-200 hover:!bg-blue-50/80 dark:hover:!bg-blue-950/60 hover:!text-[#00529C] dark:hover:!text-blue-400 transition-all duration-150"
          >
            <User size={15} />
            <span className="text-sm font-medium">{t('user_profile')}</span>
          </MenuItem>
          <MenuItem
            onClick={() => {
              const next = currentLang === 'vi' ? 'en' : 'vi';
              switchLanguage(next);
              localStorage.setItem('language', next);
              setUserMenuAnchor(null);
            }}
            className="!gap-2.5 !py-2.5 !px-3.5 !mx-2 !rounded-xl text-slate-700 dark:text-slate-200 hover:!bg-blue-50/80 dark:hover:!bg-blue-950/60 hover:!text-[#00529C] dark:hover:!text-blue-400 transition-all duration-150"
          >
            {currentLang === 'vi' ? <UKFlag /> : <VietnamFlag />}
            <span className="text-sm font-medium">{currentLang === 'vi' ? 'English' : 'Tiếng Việt'}</span>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setUserMenuAnchor(null);
              logout();
            }}
            className="!gap-2.5 !py-2.5 !px-3.5 !mx-2 !mb-1 !rounded-xl !text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-950/40 hover:!text-rose-600 dark:hover:!text-rose-400 transition-all duration-150"
          >
            <LogOut size={15} />
            <span className="text-sm font-medium">{t('logout')}</span>
          </MenuItem>
        </MuiMenu>
      </Box>
    </Box>
  );
};

export default Header;

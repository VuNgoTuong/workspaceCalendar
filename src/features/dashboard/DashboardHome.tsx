import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  Hourglass,
  LayoutDashboard,
  Layers,
  Mail,
  CalendarPlus,
  FileCheck,
  CalendarClock,
  CalendarRange,
  CalendarCheck2,
  CalendarOff,
  CalendarX2,
  CalendarDays,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  PieChart as PieChartIcon,
  CheckCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../../components/ui';
import { SpeedDialMenu } from '../../components/ui/SpeedDialMenu';
import { useAuthStore } from '../../store/authStore';
import { useActingLeaderStore } from '../../store/actingLeaderStore';
import { usePermission } from '../../hooks/usePermission';
import { useFlatMenusQuery, hasMenuPermission } from '../../hooks';
import { ScheduleCalendarType } from '../../constants/scheduleCalendarType';
import { useOverviewLeaderId } from '../work-schedule/TongHop/hooks/useCalendarOverviewQuery';
import { useInvitationStatsQuery } from '../work-schedule/LichMoiThamDu/hooks/useInvitationQueries';
import { useLeadershipStatsQuery } from '../work-schedule/DangKyLichLanhDao/hooks/useLeadershipScheduleQueries';
import { useApprovalStatsQuery } from '../work-schedule/PheDuyetLich/hooks/useScheduleApprovalQueries';
import { useDashboardOverviewQuery, usePendingActionsQuery } from './hooks/useDashboardQueries';
import type { IDashboardOverviewByType } from '../../services/api/dashboardAPI';
import { cn } from '../../utils/helpers';
import {
  CALENDAR_OVERVIEW_QUERY_KEY,
  EASE_OUT_EXPO,
  ROUTES,
  SECTION_ICON_BG,
  SPRING,
  SURFACE,
  TYPE_META,
  type IconType,
  type StatusTone,
} from './homeTheme';
import { AnimatedNumber, EmptyState, NumberSkeleton, SectionIcon } from './components/HomeBits';
import { StatusColumns } from './components/StatusColumns';
import { DayTimeline } from './components/DayTimeline';
import { ActionInbox } from './components/ActionInbox';
import { ScrollDownHint } from './components/ScrollDownHint';
import { GreetingSky, getDayPhase } from './components/GreetingSky';

const { RangePicker } = DatePicker;

const MAX_RANGE_MONTHS = 12;

type PeriodKey = 'today' | 'week' | 'month' | 'range';

const PERIOD_OPTIONS: { key: PeriodKey; labelKey: string; icon?: IconType }[] = [
  { key: 'today', labelKey: 'dashboard_home.quick_today' },
  { key: 'week', labelKey: 'dashboard_home.quick_this_week' },
  { key: 'month', labelKey: 'dashboard_home.quick_this_month' },
  { key: 'range', labelKey: 'dashboard_home.quick_range', icon: CalendarDays },
];

const formatRangeLabel = ([start, end]: [Dayjs, Dayjs]) =>
  start.isSame(end, 'day')
    ? start.format('DD/MM/YYYY')
    : `${start.format(start.isSame(end, 'year') ? 'DD/MM' : 'DD/MM/YYYY')} – ${end.format('DD/MM/YYYY')}`;

const resolvePeriodRange = (period: PeriodKey, customRange: [Dayjs, Dayjs] | null): [Dayjs, Dayjs] => {
  const today = dayjs();
  switch (period) {
    case 'today':
      return [today.startOf('day'), today.endOf('day')];
    case 'week': {
      const monday = today.subtract((today.day() + 6) % 7, 'day').startOf('day');
      return [monday, monday.add(6, 'day').endOf('day')];
    }
    case 'range':
      if (customRange) return [customRange[0].startOf('day'), customRange[1].endOf('day')];
      return [today.startOf('month'), today.endOf('month')];
    default:
      return [today.startOf('month'), today.endOf('month')];
  }
};

const OVERVIEW_TYPE_KEY: Record<ScheduleCalendarType, keyof IDashboardOverviewByType<unknown>> = {
  [ScheduleCalendarType.Personal]: 'personals',
  [ScheduleCalendarType.LeaderRegistration]: 'leaderRegistrations',
  [ScheduleCalendarType.LeaderApproval]: 'leaderApprovals',
  [ScheduleCalendarType.Invitation]: 'invitations',
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { ...SPRING, delay: i * 0.06 } }),
};

interface KpiCardProps {
  label: string;
  value: number;
  unit: string;
  icon: IconType;
  iconBg: string;
  numColor: string;
  hoverClass: string;
  loading: boolean;
  index: number;
  onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, unit, icon: Icon, iconBg, numColor, hoverClass, loading, index, onClick }) => (
  <motion.button
    type="button"
    onClick={onClick}
    variants={fadeUp}
    initial="hidden"
    animate="show"
    custom={index}
    whileHover={{ y: -3, transition: { duration: 0.15, ease: 'easeOut' } }}
    whileTap={{ scale: 0.98 }}
    className={cn(
      'group relative flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-left shadow-xs hover:shadow-md transition-[background-color,border-color,box-shadow] duration-150 cursor-pointer overflow-hidden',
      hoverClass
    )}
  >
    <div
      className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white transition-transform duration-200 ease-out group-hover:-rotate-12 group-hover:scale-105',
        iconBg
      )}
    >
      <Icon size={19} />
    </div>
    <div className="min-w-0 flex-1">
      <div className={cn('text-12 font-medium truncate', numColor)}>{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        {loading ? (
          <NumberSkeleton />
        ) : (
          <AnimatedNumber value={value} className={cn('text-22 font-semibold leading-none tracking-tight', numColor)} />
        )}
        <span className="text-11.5 text-slate-400 dark:text-slate-500">{unit}</span>
      </div>
    </div>
  </motion.button>
);

interface ModuleStat {
  icon: IconType;
  shortLabel: string;
  key: string;
  label: string;
  value: number;
  tone: StatusTone;
  tab?: string;
}

interface ModuleCardProps {
  title: string;
  icon: IconType;
  iconBg: string;
  glow: string;
  hoverClass: string;
  stats: ModuleStat[];
  /** The page's "Tất cả" count (the stats API total); summing the columns misses e.g. cancelled items. */
  total?: number;
  totalCaption: string;
  loading: boolean;
  index: number;
  onClick: (tab?: string) => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  icon: Icon,
  iconBg,
  glow,
  hoverClass,
  stats,
  total: totalProp,
  totalCaption,
  loading,
  index,
  onClick,
}) => {
  const total = totalProp ?? stats.reduce((acc, stat) => acc + stat.value, 0);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onClick()}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={index}
      whileHover={{ y: -4, transition: { duration: 0.18, ease: 'easeOut' } }}
      className={cn(
        SURFACE,
        'group relative flex flex-col gap-4 p-5 text-left cursor-pointer overflow-hidden transition-[background-color,border-color,box-shadow] duration-200',
        hoverClass
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-40 will-change-transform transition-[opacity,transform] duration-500 group-hover:opacity-70 group-hover:scale-125',
          glow
        )}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white transition-transform duration-200 ease-out group-hover:-rotate-12 group-hover:scale-105',
              iconBg
            )}
          >
            <Icon size={19} />
          </div>
          <div className="min-w-0">
            <h3 className="text-14.5 font-semibold text-slate-800 dark:text-slate-100 leading-tight">{title}</h3>
            <div className="mt-1 flex items-center gap-1 text-12 text-slate-500 dark:text-slate-400">
              {loading ? (
                <NumberSkeleton className="h-3.5 w-6" />
              ) : (
                <AnimatedNumber value={total} className="font-semibold text-slate-700 dark:text-slate-200" />
              )}
              <span>{totalCaption}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        {loading ? (
          <div className="h-[178px] rounded-xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" />
        ) : (
          <StatusColumns stats={stats} delay={0.25 + index * 0.08} onSelect={(s) => onClick(s.tab)} />
        )}
      </div>
    </motion.div>
  );
};

export const DashboardHome: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { hasRawRole } = usePermission();
  const isExecutiveAdmin = hasRawRole(['administrator', 'admin']);
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  const overviewAllUsers = isExecutiveAdmin && !actingLeaderId;
  const defaultLeaderId = useOverviewLeaderId();
  const { data: menuList = [] } = useFlatMenusQuery();
  const canApprove = hasMenuPermission(menuList, ROUTES.approvals) || isExecutiveAdmin;

  const [period, setPeriod] = useState<PeriodKey>('month');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [overviewTypeFilter, setOverviewTypeFilter] = useState<'all' | ScheduleCalendarType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [rangeStart, rangeEnd] = useMemo(() => resolvePeriodRange(period, customRange), [period, customRange]);
  const rangeKey = `${rangeStart.format('YYYYMMDD')}-${rangeEnd.format('YYYYMMDD')}`;
  const rangeLabel = formatRangeLabel([rangeStart, rangeEnd]);

  const queryClient = useQueryClient();

  const statsRange = { StartDate: rangeStart.toISOString(), EndDate: rangeEnd.toISOString() };
  const statsLeaderId = isExecutiveAdmin ? undefined : defaultLeaderId;

  const {
    data: overview,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useDashboardOverviewQuery(
    {
      userId: overviewAllUsers ? undefined : defaultLeaderId,
      fromDate: statsRange.StartDate,
      toDate: statsRange.EndDate,
    },
    overviewAllUsers || !!defaultLeaderId
  );

  const {
    data: invitationStats,
    isLoading: isInviteStatsLoading,
    refetch: refetchInviteStats,
  } = useInvitationStatsQuery({ participantId: statsLeaderId, ...statsRange });

  const {
    data: leadershipStats,
    isLoading: isLeaderStatsLoading,
    refetch: refetchLeaderStats,
  } = useLeadershipStatsQuery(statsRange);

  const {
    data: approvalStats,
    isLoading: isApprovalStatsLoading,
    refetch: refetchApprovalStats,
  } = useApprovalStatsQuery({ leaderId: statsLeaderId, ...statsRange });

  const {
    approvalTotal: pendingApprovalTotal,
    invitationTotal: pendingInvitationTotal,
    status: pendingStatus,
  } = usePendingActionsQuery(canApprove);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CALENDAR_OVERVIEW_QUERY_KEY }),
      refetchOverview(),
      refetchInviteStats(),
      refetchLeaderStats(),
      refetchApprovalStats(),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handlePeriodClick = (key: PeriodKey) => {
    if (key === 'range') {
      setRangePickerOpen(true);
      return;
    }
    setPeriod(key);
  };

  const group1Stats = useMemo(() => {
    // "Tất cả" reads the backend's overall summary; summing the per-type buckets is only a fallback.
    const overall = overviewTypeFilter === 'all' ? overview?.summary.overall : undefined;
    const types = overviewTypeFilter === 'all' ? ALL_CALENDAR_TYPES_ORDERED : [overviewTypeFilter];
    const summaries = overall ? [overall] : types.map((type) => overview?.summary[OVERVIEW_TYPE_KEY[type]]);
    const sum = (pick: (x: NonNullable<(typeof summaries)[number]>) => number) =>
      summaries.reduce((acc, x) => acc + (x ? pick(x) : 0), 0);

    return {
      total: sum((x) => x.totalSchedules),
      today: sum((x) => x.todaySchedules),
      upcoming: sum((x) => x.upcomingSchedules),
      completed: sum((x) => x.completedSchedules),
      cancelled: sum((x) => x.canceledSchedules),
    };
  }, [overview, overviewTypeFilter]);

  const group2Stats = {
    waiting: invitationStats?.waiting ?? 0,
    confirmed: invitationStats?.accepted ?? 0,
    rejected: invitationStats?.rejected ?? 0,
    cancelled: invitationStats?.cancelled ?? 0,
  };

  const group3Stats = {
    waiting: leadershipStats?.waiting ?? 0,
    approved: leadershipStats?.approved ?? 0,
    rejected: leadershipStats?.rejected ?? 0,
    cancelled: leadershipStats?.cancelled ?? 0,
  };

  const group4Stats = {
    waiting: approvalStats?.waiting ?? 0,
    approved: approvalStats?.approved ?? 0,
    rejected: approvalStats?.rejected ?? 0,
  };

  const distribution = useMemo(() => {
    const types = canApprove ? ALL_CALENDAR_TYPES_ORDERED : ALL_CALENDAR_TYPES_ORDERED.filter((x) => x !== ScheduleCalendarType.LeaderApproval);
    const counts = types.map((type) => overview?.summary[OVERVIEW_TYPE_KEY[type]]?.totalSchedules ?? 0);
    const percentages = types.map((type) => overview?.percentages[OVERVIEW_TYPE_KEY[type]] ?? 0);
    const total = counts.reduce((acc, c) => acc + c, 0);
    return { types, counts, percentages, total };
  }, [overview, canApprove]);


  const greeting = useMemo(() => {
    const phase = getDayPhase(dayjs().hour());
    return { phase, text: t(`dashboard_home.greeting_${phase}`) };
  }, [t]);

  const attentionItems = [
    {
      key: 'invites',
      show: pendingInvitationTotal > 0,
      label: t('dashboard_home.attention_invites', { count: pendingInvitationTotal }),
      className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-900/50',
      dot: 'bg-amber-500',
      to: ROUTES.invitations,
    },
    {
      key: 'approvals',
      show: pendingApprovalTotal > 0,
      label: t('dashboard_home.attention_approvals', { count: pendingApprovalTotal }),
      className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-900/50',
      dot: 'bg-emerald-500',
      to: ROUTES.approvals,
    },
  ].filter((a) => a.show);
  const isStatsLoading = pendingStatus === 'loading';

  const unit = t('dashboard_home.unit');

  const kpis: Omit<KpiCardProps, 'index' | 'loading' | 'unit'>[] = [
    {
      label: t('dashboard_home.total_schedules'),
      value: group1Stats.total,
      icon: Layers,
      iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5)]',
      numColor: 'text-[#00529C] dark:text-blue-400',
      hoverClass: 'hover:bg-blue-50/60 hover:border-blue-200 dark:hover:bg-blue-950/20 dark:hover:border-blue-800/50',
    },
    {
      label: t('dashboard_home.today_schedules'),
      value: group1Stats.today,
      icon: CalendarClock,
      iconBg: 'bg-gradient-to-br from-sky-400 to-sky-500 shadow-[0_4px_10px_-2px_rgba(14,165,233,0.5)]',
      numColor: 'text-sky-600 dark:text-sky-400',
      hoverClass: 'hover:bg-sky-50/60 hover:border-sky-200 dark:hover:bg-sky-950/20 dark:hover:border-sky-800/50',
    },
    {
      label: t('dashboard_home.upcoming_schedules'),
      value: group1Stats.upcoming,
      icon: CalendarRange,
      iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_4px_10px_-2px_rgba(249,115,22,0.5)]',
      numColor: 'text-orange-500 dark:text-orange-400',
      hoverClass: 'hover:bg-orange-50/60 hover:border-orange-200 dark:hover:bg-orange-950/20 dark:hover:border-orange-800/50',
    },
    {
      label: t('dashboard_home.completed_schedules'),
      value: group1Stats.completed,
      icon: CalendarCheck2,
      iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_4px_10px_-2px_rgba(16,185,129,0.5)]',
      numColor: 'text-emerald-600 dark:text-emerald-400',
      hoverClass: 'hover:bg-emerald-50/60 hover:border-emerald-200 dark:hover:bg-emerald-950/20 dark:hover:border-emerald-800/50',
    },
    {
      label: t('dashboard_home.cancelled_schedules'),
      value: group1Stats.cancelled,
      icon: CalendarOff,
      iconBg: 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-[0_4px_10px_-2px_rgba(100,116,139,0.45)]',
      numColor: 'text-slate-500 dark:text-slate-400',
      hoverClass: 'hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-slate-800/40 dark:hover:border-slate-700',
    },
  ];

  const filterOptions: { key: 'all' | ScheduleCalendarType; label: string }[] = [
    { key: 'all', label: t('dashboard_home.filter_all') },
    ...ALL_CALENDAR_TYPES_ORDERED.map((type) => ({ key: type, label: t(TYPE_META[type].labelKey) })),
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex flex-col gap-2 pb-5 select-none">
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
          className={cn(SURFACE, 'relative overflow-hidden p-5 sm:p-6')}
        >
          <GreetingSky phase={greeting.phase} />

          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-11.5 font-medium text-slate-500 dark:text-slate-400">
                <CalendarDays size={13} className="text-[#00529C] dark:text-blue-400" />
                <span className="capitalize">{dayjs().format('dddd, DD/MM/YYYY')}</span>
              </div>
              <h1 className="mt-1.5 text-22 sm:text-28 font-semibold tracking-tight text-slate-800 dark:text-slate-100 leading-tight flex items-center gap-2 flex-wrap">
                <span>{greeting.text},</span>
                <span className="bg-gradient-to-r from-[#00529C] to-[#0284C7] dark:from-blue-400 dark:to-sky-300 bg-clip-text text-transparent">
                  {user?.name || t('dashboard_home.default_user')}
                </span>
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 min-h-[30px]">
                <AnimatePresence mode="popLayout">
                  {isStatsLoading ? (
                    <motion.span key="loading" exit={{ opacity: 0 }} className="h-7 w-52 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  ) : attentionItems.length > 0 ? (
                    attentionItems.map((a, i) => (
                      <motion.button
                        key={a.key}
                        type="button"
                        layout
                        initial={{ opacity: 0, scale: 0.9, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ ...SPRING, delay: 0.15 + i * 0.06 }}
                        whileHover={{ y: -1.5 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate(a.to, { state: { statusTab: 'pending' } })}
                        className={cn(
                          'group inline-flex items-center gap-2 h-7 pl-2.5 pr-2 rounded-full border text-12 font-medium cursor-pointer',
                          a.className
                        )}
                      >
                        <span className="relative flex w-2 h-2">
                          <span className={cn('absolute inset-0 rounded-full animate-ping opacity-60', a.dot)} />
                          <span className={cn('relative w-2 h-2 rounded-full', a.dot)} />
                        </span>
                        {a.label}
                        <ChevronRight size={13} className="opacity-60 transition-transform group-hover:translate-x-0.5" />
                      </motion.button>
                    ))
                  ) : pendingStatus === 'error' ? null : (
                    <motion.span
                      key="clear"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="inline-flex items-center gap-2 text-12.5 text-slate-500 dark:text-slate-400"
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_3px_8px_-2px_rgba(16,185,129,0.55)]">
                        <CheckCheck size={11} strokeWidth={2.75} />
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{t('dashboard_home.attention_clear')}</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-12 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{t('dashboard_home.period_label')}:</span>
              <div className="relative max-w-full">
                <div className="flex items-center gap-0.5 h-10 p-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/60 backdrop-blur-sm max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {PERIOD_OPTIONS.map(({ key, labelKey, icon: PeriodIcon }) => {
                    const isActive = period === key;
                    const showRangeLabel = key === 'range' && isActive;
                    // Hover reveals the exact dates each preset covers ("Khoảng ngày" only once a range is picked)
                    const hoverLabel = key === 'range' && !customRange ? '' : formatRangeLabel(resolvePeriodRange(key, customRange));
                    return (
                      <Tooltip key={key} title={hoverLabel} placement="bottom" arrow>
                        <motion.button
                          key={key}
                          type="button"
                          layout
                          onClick={() => handlePeriodClick(key)}
                          aria-pressed={isActive}
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          className={cn(
                            'relative flex items-center gap-1.5 h-full px-3.5 rounded-full text-12.5 font-medium whitespace-nowrap transition-colors cursor-pointer',
                            isActive
                              ? 'text-[#00529C] dark:text-blue-300'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          )}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="dashboard-period-pill"
                              className="absolute inset-0 rounded-full bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700"
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
                          )}
                          {PeriodIcon && <PeriodIcon size={14} className="relative shrink-0" />}
                          <span className="relative tabular-nums">{showRangeLabel ? rangeLabel : t(labelKey)}</span>
                        </motion.button>
                      </Tooltip>
                    );
                  })}
                </div>

                <RangePicker
                  open={rangePickerOpen}
                  onOpenChange={setRangePickerOpen}
                  value={customRange}
                  onChange={(range) => {
                    if (range?.[0] && range?.[1]) {
                      setCustomRange([range[0], range[1]]);
                      setPeriod('range');
                    }
                    setRangePickerOpen(false);
                  }}
                  disabledDate={(current, { from }) =>
                    !!from && Math.abs(current.diff(from, 'month', true)) > MAX_RANGE_MONTHS - 1
                  }
                  format="DD/MM/YYYY"
                  placement="bottomRight"
                  allowClear={false}
                  tabIndex={-1}
                  aria-hidden
                  className="!absolute !inset-0 !w-full !min-w-0 !p-0 !opacity-0 !pointer-events-none"
                />
              </div>

              <Tooltip title={t('dashboard_home.refresh_data')}>
                <motion.button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  whileTap={{ scale: 0.92 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 hover:text-[#00529C] hover:border-[#00529C]/40 dark:hover:text-blue-400 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw size={15} className={cn('transition-transform', isRefreshing && 'animate-spin text-[#00529C] dark:text-blue-400')} />
                </motion.button>
              </Tooltip>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: EASE_OUT_EXPO }}
          className={cn(SURFACE, 'p-5 flex flex-col gap-4')}
        >
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <SectionIcon icon={LayoutDashboard} className={SECTION_ICON_BG.overview} />
              <div className="min-w-0">
                <h2 className="text-14.5 font-semibold text-slate-800 dark:text-slate-100">{t('dashboard_home.group_overview')}</h2>
                <p className="text-11.5 text-slate-500 dark:text-slate-400 line-clamp-1">{t('dashboard_home.group_overview_desc')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-12 text-slate-500 dark:text-slate-400 whitespace-nowrap">{t('dashboard_home.type_filter_label')}:</span>
              <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filterOptions.map((opt) => {
                  const isActive = overviewTypeFilter === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setOverviewTypeFilter(opt.key)}
                      className={cn(
                        'relative h-8 px-3 rounded-full text-12 font-medium whitespace-nowrap transition-colors cursor-pointer',
                        isActive
                          ? 'text-[#00529C] dark:text-blue-300'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="dashboard-overview-filter-pill"
                          className="absolute inset-0 rounded-full bg-white dark:bg-slate-900 shadow-sm"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <span className="relative flex items-center gap-1.5">
                        {opt.key !== 'all' && <span className={cn('w-1.5 h-1.5 rounded-full', TYPE_META[opt.key].accent)} />}
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => navigate(ROUTES.overview)}
                className="group inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-12 font-medium text-[#00529C] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              >
                {t('dashboard_home.view_calendar_detail')}
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {kpis.map((kpi, i) => (
              <KpiCard
                key={kpi.label}
                {...kpi}
                unit={unit}
                index={i}
                loading={isOverviewLoading}
                onClick={() => navigate(ROUTES.overview)}
              />
            ))}
          </div>
        </motion.section>

        <div className={cn('grid gap-4', canApprove ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2')}>
          <ModuleCard
            index={0}
            title={t('dashboard_home.group_invitation')}
            icon={Mail}
            iconBg="bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0_4px_10px_-2px_rgba(245,158,11,0.5)]"
            glow="bg-amber-300/60 dark:bg-amber-500/20"
            hoverClass="hover:bg-amber-50/40 hover:border-amber-300 dark:hover:bg-amber-950/15 dark:hover:border-amber-700/60 hover:shadow-[0_12px_32px_-12px_rgba(245,158,11,0.35)]"
            total={invitationStats?.total}
            totalCaption={t('dashboard_home.caption_invitations')}
            stats={[
              { key: 'waiting', label: t('dashboard_home.invite_waiting'), value: group2Stats.waiting, tab: 'pending', tone: 'waiting', icon: Hourglass, shortLabel: t('dashboard_home.short_waiting_confirm') },
              { key: 'confirmed', label: t('dashboard_home.invite_confirmed'), value: group2Stats.confirmed, tab: 'confirmed', tone: 'success', icon: CalendarCheck2, shortLabel: t('dashboard_home.short_accepted') },
              { key: 'rejected', label: t('dashboard_home.invite_rejected'), value: group2Stats.rejected, tab: 'declined', tone: 'danger', icon: CalendarX2, shortLabel: t('dashboard_home.short_rejected') },
              { key: 'cancelled', label: t('dashboard_home.invite_cancelled'), value: group2Stats.cancelled, tab: 'cancelled', tone: 'muted', icon: CalendarOff, shortLabel: t('dashboard_home.short_cancelled') },
            ]}
            loading={isInviteStatsLoading}
            onClick={(tab) => navigate(ROUTES.invitations, { state: { statusTab: tab ?? 'all' } })}
          />

          <ModuleCard
            index={1}
            title={t('dashboard_home.group_registration')}
            icon={CalendarPlus}
            iconBg="bg-gradient-to-br from-rose-400 to-rose-500 shadow-[0_4px_10px_-2px_rgba(239,68,68,0.5)]"
            glow="bg-rose-300/60 dark:bg-rose-500/20"
            hoverClass="hover:bg-rose-50/40 hover:border-rose-300 dark:hover:bg-rose-950/15 dark:hover:border-rose-700/60 hover:shadow-[0_12px_32px_-12px_rgba(239,68,68,0.35)]"
            total={leadershipStats?.total}
            totalCaption={t('dashboard_home.caption_registrations')}
            stats={[
              { key: 'waiting', label: t('dashboard_home.reg_waiting'), value: group3Stats.waiting, tab: 'pending', tone: 'waiting', icon: Hourglass, shortLabel: t('dashboard_home.short_waiting_approval') },
              { key: 'approved', label: t('dashboard_home.reg_approved'), value: group3Stats.approved, tab: 'approved', tone: 'success', icon: CalendarCheck2, shortLabel: t('dashboard_home.short_approved') },
              { key: 'rejected', label: t('dashboard_home.reg_rejected'), value: group3Stats.rejected, tab: 'rejected', tone: 'danger', icon: CalendarX2, shortLabel: t('dashboard_home.short_rejected') },
              { key: 'cancelled', label: t('dashboard_home.reg_cancelled'), value: group3Stats.cancelled, tab: 'cancelled', tone: 'muted', icon: CalendarOff, shortLabel: t('dashboard_home.short_cancelled') },
            ]}
            loading={isLeaderStatsLoading}
            onClick={(tab) => navigate(ROUTES.registrations, { state: { statusTab: tab ?? 'all' } })}
          />

          {canApprove && (
            <ModuleCard
              index={2}
              title={t('dashboard_home.group_approval')}
              icon={FileCheck}
              iconBg="bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_4px_10px_-2px_rgba(16,185,129,0.5)]"
              glow="bg-emerald-300/60 dark:bg-emerald-500/20"
              hoverClass="hover:bg-emerald-50/40 hover:border-emerald-300 dark:hover:bg-emerald-950/15 dark:hover:border-emerald-700/60 hover:shadow-[0_12px_32px_-12px_rgba(16,185,129,0.35)]"
              total={approvalStats?.total}
              totalCaption={t('dashboard_home.caption_approvals')}
              stats={[
                { key: 'waiting', label: t('dashboard_home.appr_waiting'), value: group4Stats.waiting, tab: 'pending', tone: 'waiting', icon: Hourglass, shortLabel: t('dashboard_home.short_waiting_approval') },
                { key: 'approved', label: t('dashboard_home.appr_approved'), value: group4Stats.approved, tab: 'approved', tone: 'success', icon: CalendarCheck2, shortLabel: t('dashboard_home.short_approved') },
                { key: 'rejected', label: t('dashboard_home.appr_rejected'), value: group4Stats.rejected, tab: 'rejected', tone: 'danger', icon: CalendarX2, shortLabel: t('dashboard_home.short_rejected') },
              ]}
              loading={isApprovalStatsLoading}
              onClick={(tab) => navigate(ROUTES.approvals, { state: { statusTab: tab ?? 'all' } })}
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
          <DayTimeline />

          <div className="flex flex-col gap-4 min-w-0">
            <ActionInbox canApprove={canApprove} />

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.26, ease: EASE_OUT_EXPO }}
              className={cn(SURFACE, 'p-5 flex flex-col gap-3 h-full')}
            >
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <SectionIcon icon={PieChartIcon} className={SECTION_ICON_BG.distribution} />
                  <h3 className="text-14.5 font-semibold text-slate-800 dark:text-slate-100">{t('dashboard_home.distribution_title')}</h3>
                </div>
              </div>

              {isOverviewLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-5 py-4">
                  <div className="w-[176px] h-[176px] rounded-full border-[14px] border-slate-100 dark:border-slate-800 animate-pulse" />
                  <div className="w-full grid grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-[52px] rounded-xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : distribution.total > 0 ? (
                <DistributionDonut
                  key={rangeKey}
                  types={distribution.types}
                  counts={distribution.counts}
                  percentages={distribution.percentages}
                  total={distribution.total}
                />
              ) : (
                <EmptyState icon={PieChartIcon} title={t('dashboard_home.no_schedules_in_month')} />
              )}
            </motion.section>
          </div>
        </div>

        <ScrollDownHint />
        <SpeedDialMenu />
      </div>
    </MotionConfig>
  );
};

const ALL_CALENDAR_TYPES_ORDERED = [
  ScheduleCalendarType.Personal,
  ScheduleCalendarType.LeaderRegistration,
  ScheduleCalendarType.LeaderApproval,
  ScheduleCalendarType.Invitation,
];

interface DistributionDonutProps {
  types: ScheduleCalendarType[];
  counts: number[];
  percentages: number[];
  total: number;
}

const DONUT_SIZE = 176;
const DONUT_STROKE = 22;
const DONUT_GAP = 5;

const DistributionDonut: React.FC<DistributionDonutProps> = ({ types, counts, percentages, total }) => {
  const { t } = useTranslation();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const radius = (DONUT_SIZE - DONUT_STROKE) / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const nonZero = counts.filter((c) => c > 0).length;

  const segments = useMemo(() => {
    let cursor = 0;
    return counts.map((count) => {
      const arc = (count / total) * circumference;
      const startAt = cursor;
      cursor += arc;
      if (count === 0) return null;
      const gap = nonZero > 1 ? DONUT_GAP : 0;
      return { length: Math.max(arc - gap, 1), offset: startAt + gap / 2 };
    });
  }, [counts, total, circumference, nonZero]);

  const active = activeIdx !== null && counts[activeIdx] > 0 ? activeIdx : null;
  const centerValue = active === null ? total : counts[active];
  const centerLabel = active === null ? t('dashboard_home.donut_total') : t(TYPE_META[types[active]].labelKey);
  const centerColor = active === null ? 'text-slate-800 dark:text-slate-100' : TYPE_META[types[active]].text;

  return (
    <div className="flex-1 flex flex-col justify-center gap-5">
      <div className="relative mx-auto" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
        <svg
          width={DONUT_SIZE}
          height={DONUT_SIZE}
          viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
          className="-rotate-90 overflow-visible"
        >
          <circle
            cx={DONUT_SIZE / 2}
            cy={DONUT_SIZE / 2}
            r={radius}
            fill="none"
            strokeWidth={DONUT_STROKE}
            className="stroke-slate-100 dark:stroke-slate-800"
          />
          {segments.map((seg, i) => {
            if (!seg) return null;
            const isActive = active === i;
            const isDimmed = active !== null && !isActive;
            const hex = TYPE_META[types[i]].hex;
            return (
              <motion.circle
                key={types[i]}
                cx={DONUT_SIZE / 2}
                cy={DONUT_SIZE / 2}
                r={radius}
                fill="none"
                stroke={hex}
                strokeDashoffset={-seg.offset}
                initial={{ strokeDasharray: `0 ${circumference}`, strokeWidth: DONUT_STROKE }}
                animate={{
                  strokeDasharray: `${seg.length} ${circumference}`,
                  strokeWidth: isActive ? DONUT_STROKE + 5 : DONUT_STROKE,
                  opacity: isDimmed ? 0.3 : 1,
                }}
                transition={{
                  strokeDasharray: { duration: 0.9, delay: 0.3 + i * 0.12, ease: EASE_OUT_EXPO },
                  strokeWidth: SPRING,
                  opacity: { duration: 0.2 },
                }}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                className="cursor-pointer"
                style={{ filter: isActive ? `drop-shadow(0 4px 8px ${hex}55)` : undefined }}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active ?? 'total'}
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col items-center"
            >
              <AnimatedNumber
                value={centerValue}
                className={cn('text-28 font-semibold leading-none tracking-tight', centerColor)}
              />
              <span className="mt-1.5 text-11.5 text-slate-500 dark:text-slate-400 max-w-[110px] truncate">{centerLabel}</span>
              {active !== null && (
                <span className="mt-1 text-10 font-semibold tabular-nums px-1.5 py-px rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {Math.round(percentages[active])}%
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {types.map((type, i) => {
          const meta = TYPE_META[type];
          const count = counts[i];
          const pct = Math.round(percentages[i]);
          const isActive = active === i;
          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: active !== null && !isActive ? 0.55 : 1, y: 0 }}
              transition={{ ...SPRING, delay: activeIdx === null ? 0.4 + i * 0.05 : 0 }}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              className={cn(
                'flex flex-col gap-1 px-3 py-2 rounded-xl border cursor-default transition-colors duration-150',
                isActive
                  ? cn('border-transparent', meta.chip)
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30'
              )}
            >
              <span className="flex items-center gap-1.5 text-11.5 text-slate-500 dark:text-slate-400 min-w-0">
                <span className={cn('w-2 h-2 rounded-full shrink-0', meta.accent)} />
                <span className="truncate">{t(meta.labelKey)}</span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-15 font-semibold text-slate-800 dark:text-slate-100 tabular-nums leading-none">{count}</span>
                <span className="text-11 text-slate-400 dark:text-slate-500 tabular-nums">{pct}%</span>
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardHome;

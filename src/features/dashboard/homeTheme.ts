import type React from 'react';
import { Mail, CalendarPlus, FileCheck, CircleUser } from 'lucide-react';
import { ScheduleCalendarType } from '../../constants/scheduleCalendarType';

export type IconType = React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number | string }>;

export const ALL_CALENDAR_TYPES = [
  ScheduleCalendarType.Personal,
  ScheduleCalendarType.LeaderRegistration,
  ScheduleCalendarType.LeaderApproval,
  ScheduleCalendarType.Invitation,
];

export const CALENDAR_OVERVIEW_QUERY_KEY = ['schedule-calendar-overview'];

export const ROUTES = {
  overview: '/lich-lam-viec/tong-hop',
  invitations: '/lich-lam-viec/loi-moi-tham-du',
  registrations: '/lich-lam-viec/dang-ky-lich-lanh-dao',
  approvals: '/lich-lam-viec/phe-duyet',
};

export const SURFACE =
  'rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none bg-white dark:bg-slate-900';
export const SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export const TYPE_META: Record<ScheduleCalendarType, { labelKey: string; icon: IconType; hex: string; text: string; chip: string; accent: string; hover: string }> = {
  [ScheduleCalendarType.Personal]: {
    labelKey: 'dashboard_home.filter_personal',
    icon: CircleUser,
    hex: '#0284C7',
    text: 'text-[#0284C7] dark:text-[#38BDF8]',
    chip: 'bg-sky-50 dark:bg-sky-950/50 text-[#0284C7] dark:text-[#38BDF8]',
    hover: 'hover:bg-sky-50/70 hover:border-sky-200 dark:hover:bg-sky-950/25 dark:hover:border-sky-800/60',
    accent: 'bg-[#0284C7]',
  },
  [ScheduleCalendarType.Invitation]: {
    labelKey: 'dashboard_home.filter_invitation',
    icon: Mail,
    hex: '#F59E0B',
    text: 'text-amber-600 dark:text-amber-400',
    chip: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300',
    hover: 'hover:bg-amber-50/70 hover:border-amber-200 dark:hover:bg-amber-950/25 dark:hover:border-amber-800/60',
    accent: 'bg-amber-500',
  },
  [ScheduleCalendarType.LeaderRegistration]: {
    labelKey: 'dashboard_home.filter_leader_reg',
    icon: CalendarPlus,
    hex: '#ef4444',
    text: 'text-rose-600 dark:text-rose-400',
    chip: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300',
    hover: 'hover:bg-rose-50/70 hover:border-rose-200 dark:hover:bg-rose-950/25 dark:hover:border-rose-800/60',
    accent: 'bg-rose-500',
  },
  [ScheduleCalendarType.LeaderApproval]: {
    labelKey: 'dashboard_home.filter_leader_appr',
    icon: FileCheck,
    hex: '#10B981',
    text: 'text-[#10B981] dark:text-[#34D399]',
    chip: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300',
    hover: 'hover:bg-emerald-50/70 hover:border-emerald-200 dark:hover:bg-emerald-950/25 dark:hover:border-emerald-800/60',
    accent: 'bg-[#10B981]',
  },
};

export const STATUS_TONE = {
  waiting: {
    hex: '#F59E0B',
    light: '#FBBF24',
    ink: 'text-amber-600 dark:text-amber-400',
    soft: 'bg-amber-50 dark:bg-amber-950/40',
    bar: 'bg-amber-400',
    dot: 'bg-amber-400',
  },
  success: {
    hex: '#10B981',
    light: '#34D399',
    ink: 'text-emerald-600 dark:text-emerald-400',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  danger: {
    hex: '#ef4444',
    light: '#f87171',
    ink: 'text-rose-600 dark:text-rose-400',
    soft: 'bg-rose-50 dark:bg-rose-950/40',
    bar: 'bg-rose-500',
    dot: 'bg-rose-500',
  },
  muted: {
    hex: '#94A3B8',
    light: '#CBD5E1',
    ink: 'text-slate-500 dark:text-slate-400',
    soft: 'bg-slate-100 dark:bg-slate-800',
    bar: 'bg-slate-300 dark:bg-slate-600',
    dot: 'bg-slate-300 dark:bg-slate-600',
  },
} as const;
export type StatusTone = keyof typeof STATUS_TONE;

/** Solid gradient tiles for section headers, same treatment as the module cards' icons. */
export const SECTION_ICON_BG = {
  overview: 'bg-gradient-to-br from-[#0A7BD8] to-[#00529C] shadow-[0_4px_10px_-2px_rgba(0,82,156,0.5)]',
  timeline: 'bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-[0_4px_10px_-2px_rgba(8,145,178,0.5)]',
  inbox: 'bg-gradient-to-br from-orange-400 to-rose-500 shadow-[0_4px_10px_-2px_rgba(239,68,68,0.5)]',
  distribution: 'bg-gradient-to-br from-teal-400 to-cyan-600 shadow-[0_4px_10px_-2px_rgba(8,145,178,0.5)]',
} as const;

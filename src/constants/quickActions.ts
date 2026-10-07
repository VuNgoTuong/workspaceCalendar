import { CalendarPlus, Calendar, UserPlus, FileCheck, type LucideIcon } from 'lucide-react';

export interface QuickAction {
  key: string;
  labelKey: string;
  tone?: 'blue' | 'amber';
  icon: LucideIcon;
  path: string;
  state?: Record<string, unknown>;
}

export const HEADER_QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'create-personal-schedule',
    labelKey: 'header.quick_create_personal_schedule',
    icon: Calendar,
    path: '/lich-lam-viec/ca-nhan',
    state: { autoOpenCreate: true },
  },
  {
    key: 'create-meeting',
    labelKey: 'header.quick_create_leadership_schedule',
    tone: 'amber',
    icon: CalendarPlus,
    path: '/lich-lam-viec/dang-ky-lich-lanh-dao',
    state: { autoOpenCreate: true },
  },
];

export const QUICK_ACTIONS: QuickAction[] = [
  ...HEADER_QUICK_ACTIONS,
  {
    key: 'create-approval',
    labelKey: 'work_schedule.schedule_approval',
    icon: FileCheck,
    path: '/lich-lam-viec/phe-duyet',
  },
  {
    key: 'create-invite',
    labelKey: 'work_schedule.meeting_invitations',
    icon: UserPlus,
    path: '/lich-lam-viec/loi-moi-tham-du',
  },
];




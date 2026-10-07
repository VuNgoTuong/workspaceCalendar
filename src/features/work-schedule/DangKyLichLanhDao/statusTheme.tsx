import { Circle, CircleCheck, X, CalendarOff, CheckCheck, Send, FileText } from 'lucide-react';
import { STATUS_COLOR_PALETTE, type StatusColorFamily } from '../../../constants/statusColorPalette';
import type { RequestStatus } from './types';

export interface StatusMeta {
  labelKey: string;
  dotClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  icon: React.ReactNode;
}

const ICON_SIZE = 12;

export const STATUS_COLOR_FAMILY: Record<RequestStatus, StatusColorFamily> = {
  submitted: 'blue',
  pending: 'amber',
  approved: 'emerald',
  rejected: 'rose',
  cancelled: 'slate',
  completed: 'teal',
  draft: 'slate',
};

const STATUS_ICON: Record<RequestStatus, React.ReactNode> = {
  submitted: <Send size={ICON_SIZE} />,
  pending: <Circle size={ICON_SIZE} />,
  approved: <CircleCheck size={ICON_SIZE} />,
  rejected: <X size={ICON_SIZE} strokeWidth={2.5} />,
  cancelled: <CalendarOff size={ICON_SIZE} />,
  completed: <CheckCheck size={ICON_SIZE} />,
  draft: <FileText size={ICON_SIZE} />,
};

const STATUS_LABEL_KEY: Record<RequestStatus, string> = {
  submitted: 'leadership_schedule.status_submitted',
  pending: 'leadership_schedule.status_pending',
  approved: 'leadership_schedule.status_approved',
  rejected: 'leadership_schedule.status_rejected',
  cancelled: 'leadership_schedule.status_cancelled',
  completed: 'leadership_schedule.status_completed',
  draft: 'leadership_schedule.status_draft',
};

export const STATUS_THEME: Record<RequestStatus, StatusMeta> = Object.fromEntries(
  (Object.keys(STATUS_COLOR_FAMILY) as RequestStatus[]).map((status) => {
    const colors = STATUS_COLOR_PALETTE[STATUS_COLOR_FAMILY[status]];
    return [
      status,
      {
        labelKey: STATUS_LABEL_KEY[status],
        dotClass: colors.dot,
        textClass: colors.text,
        bgClass: colors.bg,
        borderClass: colors.border,
        icon: STATUS_ICON[status],
      },
    ];
  })
) as Record<RequestStatus, StatusMeta>;

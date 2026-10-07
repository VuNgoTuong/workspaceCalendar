import { STATUS_COLOR_PALETTE, type StatusColorFamily } from '../../../constants/statusColorPalette';
import type { ApprovalStatus } from './types';

export interface StatusMeta {
  labelKey: string;
  dotClass: string;
  textClass: string;
  bgClass: string;
}

const STATUS_COLOR_FAMILY: Record<ApprovalStatus, StatusColorFamily> = {
  pending: 'amber',
  approved: 'emerald',
  rejected: 'rose',
  cancelled: 'slate',
};

const STATUS_LABEL_KEY: Record<ApprovalStatus, string> = {
  pending: 'schedule_approval.status_pending',
  approved: 'schedule_approval.status_approved',
  rejected: 'schedule_approval.status_rejected',
  cancelled: 'schedule_approval.status_cancelled',
};

export const STATUS_THEME: Record<ApprovalStatus, StatusMeta> = Object.fromEntries(
  (Object.keys(STATUS_COLOR_FAMILY) as ApprovalStatus[]).map((status) => {
    const colors = STATUS_COLOR_PALETTE[STATUS_COLOR_FAMILY[status]];
    return [
      status,
      { labelKey: STATUS_LABEL_KEY[status], dotClass: colors.dot, textClass: colors.text, bgClass: colors.bg },
    ];
  })
) as Record<ApprovalStatus, StatusMeta>;

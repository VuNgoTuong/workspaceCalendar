import { STATUS_COLOR_PALETTE, type StatusColorFamily } from '../../../constants/statusColorPalette';
import type { InvitationStatus } from './types';

export interface StatusMeta {
  labelKey: string;
  dotClass: string;
  textClass: string;
  bgClass: string;
}

const STATUS_COLOR_FAMILY: Record<InvitationStatus, StatusColorFamily> = {
  pending: 'amber',
  confirmed: 'emerald',
  declined: 'slate',
  cancelled: 'slate',
};

const STATUS_LABEL_KEY: Record<InvitationStatus, string> = {
  pending: 'meeting_invitations.status_pending',
  confirmed: 'meeting_invitations.status_confirmed',
  declined: 'meeting_invitations.status_declined',
  cancelled: 'meeting_invitations.status_cancelled',
};

export const STATUS_THEME: Record<InvitationStatus, StatusMeta> = Object.fromEntries(
  (Object.keys(STATUS_COLOR_FAMILY) as InvitationStatus[]).map((status) => {
    const colors = STATUS_COLOR_PALETTE[STATUS_COLOR_FAMILY[status]];
    return [
      status,
      { labelKey: STATUS_LABEL_KEY[status], dotClass: colors.dot, textClass: colors.text, bgClass: colors.bg },
    ];
  })
) as Record<InvitationStatus, StatusMeta>;

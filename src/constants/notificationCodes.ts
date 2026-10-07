import type { TFunction } from 'i18next';
import { ScheduleCategory } from './scheduleCategory';

export const NOTIFICATION_CODES = {
  // personal schedule
  NewPersonalSchedule: 'schedule.personal.created',
  UpdatePersonalSchedule: 'schedule.personal.updated',
  InvitationPersonalSchedule: 'schedule.personal.invited',
  UndoInvitationPersonalSchedule: 'schedule.personal.undo-invited',
  CancelPersonalSchedule: 'schedule.personal.cancelled',
  ApprovePersonalSchedule: 'schedule.personal.approved',
  RejectPersonalSchedule: 'schedule.personal.rejected',

  // leader registration schedule
  NewLeaderRegistrationSchedule: 'schedule.leader-registration.created',
  UpdateLeaderRegistrationSchedule: 'schedule.leader-registration.updated',
  InvitationLeaderRegistrationSchedule: 'schedule.leader-registration.invited',
  UndoInvitationLeaderRegistrationSchedule: 'schedule.leader-registration.undo-invited',
  ApproveLeaderRegistrationSchedule: 'schedule.leader-registration.approved',
  RejectLeaderRegistrationSchedule: 'schedule.leader-registration.rejected',
  CancelLeaderRegistrationSchedule: 'schedule.leader-registration.cancelled',

  // invitation
  ApproveInvitationSchedule: 'schedule.invitation-schedule.approved',
  RejectInvitationSchedule: 'schedule.invitation-schedule.rejected',
  CancelInvitationSchedule: 'schedule.invitation-schedule.cancelled',

  // delegation
  NewDelegation: 'schedule.delegation.new',

  PersonalScheduleExpired: 'schedule.personal.expired',
  LeaderScheduleExpired: 'schedule.leader-registration.expired',
  InvitationExpired: 'schedule.invitation-schedule.expired',
} as const;

export type NotificationCode = (typeof NOTIFICATION_CODES)[keyof typeof NOTIFICATION_CODES];

export const normalizeNotificationCode = (code?: string | null): string =>
  (code || '').toLowerCase().replace(/\./g, '-');

const KNOWN_CODES = new Set<string>(Object.values(NOTIFICATION_CODES).map(normalizeNotificationCode));

const toI18nKey = (code: string): string => code.replace(/[.-]/g, '_');

export const isKnownNotificationCode = (code?: string | null): code is NotificationCode =>
  !!code && KNOWN_CODES.has(normalizeNotificationCode(code));

export interface INotificationDisplay {
  title: string;
  message: string;
}

export const parseNotificationContent = (content: any): Record<string, any> => {
  if (!content) return {};
  if (typeof content === 'object') return content;
  let parsed = content;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      // ignore
    }
  }
  if (typeof parsed === 'object' && parsed !== null) {
    return parsed;
  }
  return {};
};

export const extractNotificationScheduleCategory = (content: any): ScheduleCategory | null => {
  const params = parseNotificationContent(content);
  const value = Number(params.ScheduleCategory ?? params.scheduleCategory);
  return value === ScheduleCategory.Personal || value === ScheduleCategory.LeaderRegistration ? value : null;
};

const getScheduleCategoryLabel = (t: TFunction, params: Record<string, any>): string => {
  switch (extractNotificationScheduleCategory(params)) {
    case ScheduleCategory.Personal:
      return t('notification_format.category_personal');
    case ScheduleCategory.LeaderRegistration:
      return t('notification_format.category_leader');
    default:
      return '';
  }
};

const INVITATION_SCHEDULE_CODES = new Set<string>(
  [
    NOTIFICATION_CODES.ApproveInvitationSchedule,
    NOTIFICATION_CODES.RejectInvitationSchedule,
    NOTIFICATION_CODES.CancelInvitationSchedule,
    NOTIFICATION_CODES.InvitationExpired,
  ].map(normalizeNotificationCode)
);

const formatDefaultMessage = (
  t: TFunction,
  code: string | undefined | null,
  fallbackTitle: string,
  fallbackContent: string,
  params: Record<string, any>
): { title: string; message: string } => {
  const scheduleTitle = params.Title || params.title || '';
  const actorName = params.ActorName || params.actorName || '';
  const reason = params.Reason || params.reason || params.RejectReason || params.rejectReason || '';
  const isJson = Object.keys(params).length > 0;
  const categoryLabel = getScheduleCategoryLabel(t, params);
  const scheduleLabel = categoryLabel || t('notification_format.category_generic');
  const scheduleRef = scheduleTitle
    ? t('notification_format.schedule_ref', { label: scheduleLabel, title: scheduleTitle })
    : scheduleLabel;
  const vars = { title: scheduleTitle, actor: actorName, ref: scheduleRef, label: scheduleLabel, category: categoryLabel };
  const reasonSuffix = reason ? t('notification_format.reason_suffix', { reason }) : '';
  const normalized = normalizeNotificationCode(code);
  const codeTitle = () => t(`notification_codes.${toI18nKey(normalized)}.title`);
  // Picks `<base>_by` (title + actor), `<base>_titled` (title only) or `<base>` (neither).
  const pick = (base: string) =>
    t(
      `notification_format.${scheduleTitle && actorName ? `${base}_by` : scheduleTitle ? `${base}_titled` : base}`,
      vars
    );
  const categoryTitle = (base: string) =>
    t(`notification_format.${categoryLabel ? `${base}_title_cat` : `${base}_title`}`, vars);

  switch (normalized) {
    case normalizeNotificationCode(NOTIFICATION_CODES.ApproveLeaderRegistrationSchedule):
      return { title: codeTitle(), message: pick('leader_approved') };

    case normalizeNotificationCode(NOTIFICATION_CODES.RejectLeaderRegistrationSchedule):
      return { title: codeTitle(), message: pick('leader_rejected') + reasonSuffix };

    case normalizeNotificationCode(NOTIFICATION_CODES.CancelLeaderRegistrationSchedule):
      return { title: codeTitle(), message: pick('leader_cancelled') };

    case normalizeNotificationCode(NOTIFICATION_CODES.NewLeaderRegistrationSchedule):
      return { title: codeTitle(), message: pick('leader_created') };

    case normalizeNotificationCode(NOTIFICATION_CODES.UpdateLeaderRegistrationSchedule):
      return { title: codeTitle(), message: pick('leader_updated') };

    case normalizeNotificationCode(NOTIFICATION_CODES.InvitationLeaderRegistrationSchedule):
      return { title: codeTitle(), message: pick('leader_invited') };

    case normalizeNotificationCode(NOTIFICATION_CODES.ApproveInvitationSchedule):
      return {
        title: categoryTitle('invitation_approved'),
        message: t(`notification_format.${actorName ? 'invitation_approved_by' : 'invitation_approved'}`, vars),
      };

    case normalizeNotificationCode(NOTIFICATION_CODES.RejectInvitationSchedule):
      return {
        title: categoryTitle('invitation_rejected'),
        message: t(`notification_format.${actorName ? 'invitation_rejected_by' : 'invitation_rejected'}`, vars) + reasonSuffix,
      };

    case normalizeNotificationCode(NOTIFICATION_CODES.CancelInvitationSchedule):
      return {
        title: categoryTitle('invitation_cancelled'),
        message: t(`notification_format.${actorName ? 'invitation_cancelled_by' : 'invitation_cancelled'}`, vars),
      };

    case normalizeNotificationCode(NOTIFICATION_CODES.NewPersonalSchedule):
      return { title: codeTitle(), message: pick('personal_created') };

    case normalizeNotificationCode(NOTIFICATION_CODES.UpdatePersonalSchedule):
      return { title: codeTitle(), message: pick('personal_updated') };

    case normalizeNotificationCode(NOTIFICATION_CODES.InvitationPersonalSchedule):
      return { title: codeTitle(), message: pick('personal_invited') };

    case normalizeNotificationCode(NOTIFICATION_CODES.UndoInvitationPersonalSchedule):
    case normalizeNotificationCode(NOTIFICATION_CODES.UndoInvitationLeaderRegistrationSchedule):
      return { title: codeTitle(), message: pick('undo_invited') };

    case normalizeNotificationCode(NOTIFICATION_CODES.CancelPersonalSchedule):
      return { title: codeTitle(), message: pick('personal_cancelled') };

    case normalizeNotificationCode(NOTIFICATION_CODES.ApprovePersonalSchedule):
      return { title: codeTitle(), message: pick('personal_approved') };

    case normalizeNotificationCode(NOTIFICATION_CODES.RejectPersonalSchedule):
      return { title: codeTitle(), message: pick('personal_rejected') + reasonSuffix };

    case normalizeNotificationCode(NOTIFICATION_CODES.NewDelegation):
      return {
        title: codeTitle(),
        message: t(`notification_format.${actorName ? 'delegation_new_by' : 'delegation_new'}`, vars),
      };

    case normalizeNotificationCode(NOTIFICATION_CODES.PersonalScheduleExpired):
      return {
        title: codeTitle(),
        message: t(`notification_format.${scheduleTitle ? 'personal_expired_titled' : 'personal_expired'}`, vars),
      };

    case normalizeNotificationCode(NOTIFICATION_CODES.LeaderScheduleExpired):
      return {
        title: codeTitle(),
        message: t(`notification_format.${scheduleTitle ? 'leader_expired_titled' : 'leader_expired'}`, vars),
      };

    case normalizeNotificationCode(NOTIFICATION_CODES.InvitationExpired):
      return {
        title: categoryTitle('invitation_expired'),
        message: t(`notification_format.${scheduleTitle ? 'invitation_expired_titled' : 'invitation_expired'}`, vars),
      };

    default: {
      const scheduleFallbackTitle = fallbackTitle || t('notification_format.default_title_schedule');
      const plainFallbackTitle = fallbackTitle || t('notification_format.default_title');
      if (isJson) {
        if (scheduleTitle && actorName) {
          return { title: scheduleFallbackTitle, message: t('notification_format.default_by', vars) };
        }
        if (scheduleTitle) return { title: scheduleFallbackTitle, message: t('notification_format.default_titled', vars) };
        if (params.Message || params.message)
          return { title: plainFallbackTitle, message: params.Message || params.message };
      }
      return { title: plainFallbackTitle, message: fallbackContent };
    }
  }
};

export const getNotificationDisplay = (
  t: TFunction,
  code: string | undefined | null,
  fallbackTitle: string,
  fallbackContent: string
): INotificationDisplay => {
  const params = parseNotificationContent(fallbackContent);
  const formattedDefault = formatDefaultMessage(t, code, fallbackTitle, fallbackContent, params);

  if (!isKnownNotificationCode(code)) {
    return formattedDefault;
  }

  // Static i18n strings for invitation codes can't name the invitee who confirmed/declined
  // or the schedule category, so always use the formatted message for them.
  if (INVITATION_SCHEDULE_CODES.has(normalizeNotificationCode(code))) {
    return formattedDefault;
  }

  const key = toI18nKey(code);
  const title = t(`notification_codes.${key}.title`, { ...params, defaultValue: formattedDefault.title });
  const message = t(`notification_codes.${key}.message`, { ...params, defaultValue: formattedDefault.message });

  let finalMessage = message;
  if (params.Title && !finalMessage.includes(params.Title)) {
    finalMessage = formattedDefault.message;
  }

  return { title: title || formattedDefault.title, message: finalMessage || formattedDefault.message };
};

export const extractNotificationTargetId = (content: any): string | null => {
  const params = parseNotificationContent(content);
  if (!params || typeof params !== 'object') return null;

  if (Array.isArray(params.ScheduleOccurrenceIds) && params.ScheduleOccurrenceIds.length > 0) {
    return String(params.ScheduleOccurrenceIds[0]);
  }
  if (Array.isArray(params.DelegationIds) && params.DelegationIds.length > 0) {
    return String(params.DelegationIds[0]);
  }
  if (Array.isArray(params.ids) && params.ids.length > 0) {
    return String(params.ids[0]);
  }
  if (Array.isArray(params.Ids) && params.Ids.length > 0) {
    return String(params.Ids[0]);
  }

  if (params.ScheduleOccurrenceId) return String(params.ScheduleOccurrenceId);
  if (params.DelegationId) return String(params.DelegationId);
  if (params.id) return String(params.id);
  if (params.Id) return String(params.Id);

  for (const [key, val] of Object.entries(params)) {
    if (Array.isArray(val) && val.length > 0 && key.toLowerCase().includes('id')) {
      return String(val[0]);
    }
    if (typeof val === 'string' && val && key.toLowerCase().includes('id')) {
      return String(val);
    }
  }

  return null;
};

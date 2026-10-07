import { fromApiDateTime } from '../../../../utils/dateTime';
import { ScheduleCalendarType } from '../../../../constants/scheduleCalendarType';
import type { MeetingType } from '../../../../constants/meetingType';
import type { SchedulePriority } from '../../../../constants/schedulePriority';
import type { ScheduleOccurrenceStatus } from '../../../../constants/scheduleOccurrenceStatus';
import { resolveInvitationDisplayStatus, type ScheduleInvitationFilterStatus } from '../../../../constants/participationStatus';
import type { IScheduleOccurrenceCalendarItem } from '../../../../services/api/scheduleOccurrenceAPI';
import type { EventColorKey } from '../calendarTheme';

export interface OverviewEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  meetingType: MeetingType;
  priority: SchedulePriority;
  status: ScheduleOccurrenceStatus;
  displayStatus: ScheduleOccurrenceStatus;
  participantStatus?: ScheduleInvitationFilterStatus | null;
  calendarType: ScheduleCalendarType;
  color: EventColorKey;
  scheduleTypeName?: string | null;
  raw?: IScheduleOccurrenceCalendarItem;
}

export const COLOR_BY_CALENDAR_TYPE: Record<ScheduleCalendarType, EventColorKey> = {
  [ScheduleCalendarType.Personal]: 'blue',
  [ScheduleCalendarType.LeaderRegistration]: 'rose',
  [ScheduleCalendarType.LeaderApproval]: 'green',
  [ScheduleCalendarType.Invitation]: 'amber',
};

export const mapCalendarItemToEvent = (item: IScheduleOccurrenceCalendarItem): OverviewEvent => ({
  id: item.id,
  title: item.title || '',
  start: fromApiDateTime(item.startDate).toDate(),
  end: fromApiDateTime(item.endDate).toDate(),
  location: item.location || undefined,
  meetingType: item.meetingType,
  priority: item.priority,
  status: item.status,
  displayStatus:
    item.calendarType === ScheduleCalendarType.Invitation
      ? resolveInvitationDisplayStatus(item.status, item.participantStatus)
      : item.status,
  participantStatus: item.calendarType === ScheduleCalendarType.Invitation ? item.participantStatus : undefined,
  calendarType: item.calendarType,
  color: COLOR_BY_CALENDAR_TYPE[item.calendarType],
  scheduleTypeName: item.scheduleTypeName,
  raw: item,
});

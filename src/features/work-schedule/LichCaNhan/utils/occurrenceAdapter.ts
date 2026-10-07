import { MeetingType } from '../../../../constants/meetingType';
import { SchedulePriority } from '../../../../constants/schedulePriority';
import { ScheduleCategory } from '../../../../constants/scheduleCategory';
import { ScheduleOccurrenceStatus } from '../../../../constants/scheduleOccurrenceStatus';
import type { ParticipationStatus } from '../../../../constants/participationStatus';
import type { IScheduleOccurrence, IScheduleOccurrenceCalendarItem } from '../../../../services/api/scheduleOccurrenceAPI';
import { toApiDateTime, fromApiDateTime } from '../../../../utils/dateTime';
import type {
  MeetingFormat,
  PersonalScheduleEvent,
  PersonalScheduleInput,
  SchedulePriority as UiSchedulePriority,
  ScheduleStatus,
} from '../types';

const MEETING_FORMAT_BY_TYPE: Record<number, MeetingFormat> = {
  [MeetingType.Offline]: 'offline',
  [MeetingType.Online]: 'online',
};

const MEETING_TYPE_BY_FORMAT: Record<MeetingFormat, MeetingType> = {
  offline: MeetingType.Offline,
  online: MeetingType.Online,
};

const PRIORITY_BY_VALUE: Record<number, UiSchedulePriority> = {
  [SchedulePriority.Normal]: 'normal',
  [SchedulePriority.Urgent]: 'urgent',
};

const PRIORITY_VALUE_BY_UI: Record<UiSchedulePriority, SchedulePriority> = {
  normal: SchedulePriority.Normal,
  urgent: SchedulePriority.Urgent,
};

const STATUS_BY_VALUE: Record<number, ScheduleStatus> = {
  [ScheduleOccurrenceStatus.Draft]: 'draft',
  [ScheduleOccurrenceStatus.Waiting]: 'pending',
  [ScheduleOccurrenceStatus.Approved]: 'approved',
  [ScheduleOccurrenceStatus.Rejected]: 'rejected',
  [ScheduleOccurrenceStatus.Cancelled]: 'cancelled',
};

/** Backend returns a single `approval` object; `approvals` is kept only as a defensive fallback. */
const getApproval = (dto: IScheduleOccurrence) => dto.approval ?? dto.approvals?.[0];

export const mapOccurrenceToEvent = (dto: IScheduleOccurrence): PersonalScheduleEvent => {
  const start = fromApiDateTime(dto.startDate);
  const end = fromApiDateTime(dto.endDate);

  return {
    id: dto.id,
    scheduleId: dto.scheduleId,
    isGroupSchedule: dto.isGroupSchedule,
    code: dto.code || '',
    title: dto.title || '',
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
    startTime: start.format('HH:mm'),
    endTime: end.format('HH:mm'),
    location: dto.location || '',
    scheduleTypeId: dto.scheduleTypeId || dto.scheduleType?.id || '',
    scheduleTypeName: dto.scheduleType?.name || '',
    ownerUserId: dto.ownerUserId,
    ownerUser: dto.ownerUser
      ? {
          id: dto.ownerUser.id,
          fullname: dto.ownerUser.fullname || '',
          email: dto.ownerUser.email,
          phoneNumber: dto.ownerUser.phoneNumber,
          employeeCode: dto.ownerUser.employeeCode,
          departmentName: dto.ownerUser.departmentName,
          positionName: dto.ownerUser.positionName,
          jobTitleName: dto.ownerUser.jobTitleName,
          avatarUrl: dto.ownerUser.avatarUrl,
        }
      : undefined,
    meetingFormat: MEETING_FORMAT_BY_TYPE[dto.meetingType] || 'offline',
    priority: PRIORITY_BY_VALUE[dto.priority] || 'normal',
    status: STATUS_BY_VALUE[dto.status] || 'created',
    cancelledReason: dto.cancelledReason || undefined,
    rejectReason: dto.rejectReason || getApproval(dto)?.rejectReason || undefined,
    participants: (dto.participants || []).map((p) => ({
      id: p.participantId || p.id,
      name: p.participant?.fullname || p.fullNameSnapshot || '',
      email: p.participant?.email || p.emailSnapshot,
      code: p.participant?.employeeCode || p.employeeCodeSnapshot,
      department: p.participant?.departmentName || p.departmentNameSnapshot,
      positionName: p.participant?.positionName,
      jobTitleName: p.participant?.jobTitleName,
      phoneNumber: p.participant?.phoneNumber,
      avatarUrl: p.participant?.avatarUrl,
      status: p.status as ParticipationStatus,
      rejectReason: p.rejectReason || undefined,
    })),
    content: dto.detailContent || '',
    note: dto.note || undefined,
    attachments: (dto.attachments || []).map((a) => ({
      id: a.id,
      name: a.name || (a.pathName || a.path || '').split(/[/\\]/).pop() || a.pathName || a.path || '',
      size: 0,
      url: a.pathName || a.path || undefined,
    })),
    link: undefined,
    isSendEmail: dto.isSendEmail,
    isConfidential: dto.isConfidential ?? false,
    isApprovalRequired: dto.isApprovalRequired ?? false,
  };
};

export const mapCalendarItemToEvent = (item: IScheduleOccurrenceCalendarItem): PersonalScheduleEvent => {
  const start = fromApiDateTime(item.startDate);
  const end = fromApiDateTime(item.endDate);

  return {
    id: item.id,
    scheduleId: item.id,
    isGroupSchedule: false,
    code: item.code || '',
    title: item.title || '',
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
    startTime: start.format('HH:mm'),
    endTime: end.format('HH:mm'),
    location: item.location || '',
    scheduleTypeId: item.scheduleTypeId || '',
    scheduleTypeName: item.scheduleTypeName || '',
    ownerUserId: '',
    meetingFormat: MEETING_FORMAT_BY_TYPE[item.meetingType] || 'offline',
    priority: PRIORITY_BY_VALUE[item.priority] || 'normal',
    status: STATUS_BY_VALUE[item.status] || 'created',
    participants: [],
    content: '',
    attachments: [],
    isSendEmail: false,
    isConfidential: false,
    isApprovalRequired: false,
  };
};

const combineDateTime = toApiDateTime;

const appendField = (fd: FormData, key: string, value: string | number | boolean | undefined | null) => {
  if (value === undefined || value === null || value === '') return;
  fd.append(key, typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value));
};

const appendCommonFields = (fd: FormData, input: PersonalScheduleInput) => {
  appendField(fd, 'StartDate', combineDateTime(input.startDate, input.startTime));
  appendField(fd, 'EndDate', combineDateTime(input.endDate, input.endTime));
  appendField(fd, 'IsSingleDay', input.isSingleDay ?? (input.startDate === input.endDate));
  appendField(fd, 'IsMultiDay', input.isMultiDay ?? (input.startDate !== input.endDate));
  appendField(fd, 'ScheduleTypeId', input.scheduleTypeId);
  appendField(fd, 'Title', input.title);
  appendField(fd, 'Location', input.location);
  appendField(fd, 'MeetingType', MEETING_TYPE_BY_FORMAT[input.meetingFormat]);
  appendField(fd, 'Priority', PRIORITY_VALUE_BY_UI[input.priority]);
  appendField(fd, 'DetailContent', input.content);
  appendField(fd, 'Note', input.note);
  appendField(fd, 'IsSendEmail', input.isSendEmail);
  appendField(fd, 'IsConfidential', input.isConfidential);
  appendField(fd, 'IsApprovalRequired', input.isApprovalRequired);

  (input.link ? input.link.split('\n').filter(Boolean) : []).forEach((link) => fd.append('AttachmentLinks', link));
  input.participants.forEach((p) => fd.append('ParticipantIds', p.id));
};

export const buildCreateOccurrenceFormData = (
  input: PersonalScheduleInput,
  ownerUserId: string | undefined,
  scheduleCategory: (typeof ScheduleCategory)[keyof typeof ScheduleCategory],
  isDraft: boolean
): FormData => {
  const fd = new FormData();
  appendField(fd, 'OwnerUserId', ownerUserId);
  appendField(fd, 'ScheduleCategory', scheduleCategory);
  appendField(fd, 'IsDraft', isDraft);
  appendCommonFields(fd, input);
  input.attachments.forEach((a) => {
    if (a.file) fd.append('AttachmentFiles', a.file);
  });
  return fd;
};

export const buildUpdateOccurrenceFormData = (
  input: PersonalScheduleInput,
  ownerUserId: string | undefined,
  isDraft?: boolean,
  isUpdateSingleDay?: boolean
): FormData => {
  const fd = new FormData();
  appendField(fd, 'OwnerUserId', ownerUserId);
  if (isDraft !== undefined) appendField(fd, 'IsDraft', isDraft);
  const updateSingleDayVal = isUpdateSingleDay !== undefined ? isUpdateSingleDay : (input.isSingleDay ?? (input.startDate === input.endDate));
  appendField(fd, 'IsUpdateSingleDay', updateSingleDayVal);
  appendCommonFields(fd, input);
  input.attachments.forEach((a) => {
    if (a.file) fd.append('AttachmentFiles', a.file);
    else fd.append('AttachmentIds', a.id);
  });
  return fd;
};

import { MeetingType } from '../../../../constants/meetingType';
import { SchedulePriority } from '../../../../constants/schedulePriority';
import { ScheduleCategory } from '../../../../constants/scheduleCategory';
import { ScheduleOccurrenceStatus } from '../../../../constants/scheduleOccurrenceStatus';
import type { IScheduleOccurrence, IScheduleOccurrenceCalendarItem } from '../../../../services/api/scheduleOccurrenceAPI';
import { toApiDateTime, fromApiDateTime } from '../../../../utils/dateTime';
import type { MeetingFormat, RequestStatus, RequestTimelineEntry, ScheduleRequest, SchedulePriority as UiSchedulePriority, TimelineStepKey } from '../types';
import type { LeadershipRequestInput } from '../hooks/useLeadershipScheduleQueries';

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

const STATUS_BY_VALUE: Record<number, RequestStatus> = {
  [ScheduleOccurrenceStatus.Draft]: 'draft',
  [ScheduleOccurrenceStatus.Created]: 'submitted',
  [ScheduleOccurrenceStatus.Waiting]: 'pending',
  [ScheduleOccurrenceStatus.Approved]: 'approved',
  [ScheduleOccurrenceStatus.Rejected]: 'rejected',
  [ScheduleOccurrenceStatus.Cancelled]: 'cancelled',
};

const TIMELINE_KEY_BY_STATUS: Record<RequestStatus, TimelineStepKey> = {
  draft: 'draft',
  submitted: 'submitted',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
  completed: 'completed',
};

/** Backend returns a single `approval` object; `approvals` is kept only as a defensive fallback. */
const getApproval = (dto: IScheduleOccurrence) => dto.approval ?? dto.approvals?.[0];

const buildTimeline = (status: RequestStatus, dto: IScheduleOccurrence): RequestTimelineEntry[] => {
  const rawAt = dto.cancelledAt || getApproval(dto)?.approvedAt || dto.startDate;
  return [{ key: TIMELINE_KEY_BY_STATUS[status], at: fromApiDateTime(rawAt).toISOString() }];
};

export const mapOccurrenceToRequest = (dto: IScheduleOccurrence): ScheduleRequest => {
  const start = fromApiDateTime(dto.startDate);
  const end = fromApiDateTime(dto.endDate);
  const status = STATUS_BY_VALUE[dto.status] || 'pending';

  const durationMinutes = Math.max(0, end.hour() * 60 + end.minute() - (start.hour() * 60 + start.minute()));

  const owner = dto.ownerUser;
  const ownerDept = owner?.departmentName || owner?.unitName || owner?.positionName || owner?.jobTitleName || '';

  const leader = dto.leaderUser;
  const leaderName = leader?.fullname || leader?.username || '';
  const leaderTitle = leader?.positionName || leader?.jobTitleName || '';
  const leaderAvatar = leader?.avatarUrl || undefined;
  const leaderCode = leader?.employeeCode || undefined;
  const leaderDept = leader?.departmentName || leader?.unitName || undefined;
  const scheduleTypeName = dto.scheduleType?.name || undefined;

  return {
    id: dto.id,
    code: dto.code || '',
    scheduleId: dto.scheduleId,
    isGroupSchedule: dto.isGroupSchedule,
    executiveId: dto.leaderUserId || leader?.id || '',
    executiveName: leaderName || undefined,
    executiveTitle: leaderTitle || undefined,
    executiveAvatarUrl: leaderAvatar,
    executiveCode: leaderCode,
    executiveDepartment: leaderDept,
    title: dto.title || '',
    description: dto.detailContent || undefined,
    durationMinutes,
    date: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
    startTime: start.format('HH:mm'),
    endTime: end.format('HH:mm'),
    location: dto.location || '',
    scheduleTypeId: dto.scheduleTypeId || dto.scheduleType?.id || undefined,
    scheduleTypeName,
    meetingFormat: MEETING_FORMAT_BY_TYPE[dto.meetingType] || 'offline',
    priority: PRIORITY_BY_VALUE[dto.priority] || 'normal',
    requester: {
      id: dto.ownerUserId,
      name: owner?.fullname || owner?.username || '',
      department: ownerDept || undefined,
      code: owner?.employeeCode || undefined,
      avatarUrl: owner?.avatarUrl || undefined,
      position: owner?.positionName || owner?.jobTitleName || undefined,
      email: owner?.email || undefined,
      phone: owner?.phoneNumber || undefined,
    },
    participants: (dto.participants || []).map((p: any) => {
      const u = p.participant || p.user || p.ownerUser || p;
      const name =
        u.fullname ||
        u.fullName ||
        u.fullNameSnapshot ||
        u.name ||
        u.participantName ||
        u.userName ||
        u.username ||
        p.fullNameSnapshot ||
        p.fullname ||
        p.fullName ||
        p.name ||
        u.employeeCode ||
        u.code ||
        '';
      return {
        id: p.participantId || u.id || p.id || '',
        name: typeof name === 'string' ? name.trim() : String(name || ''),
        email: u.email || p.emailSnapshot || p.email || null,
        phone: u.phoneNumber || u.phone || p.phoneNumberSnapshot || p.phoneNumber || null,
        code: u.employeeCode || p.employeeCodeSnapshot || p.employeeCode || p.code || null,
        avatarUrl: u.avatarUrl || p.avatarUrl || null,
        position: u.positionName || u.jobTitleName || null,
        department: u.departmentName || u.unitName || null,
        status: p.status,
        rejectReason: p.rejectReason || null,
      };
    }),
    note: dto.note || undefined,
    attachments: (dto.attachments || []).map((a) => ({
      id: a.id,
      name: a.name || (a.path || a.pathName || '').split(/[\\/]/).pop() || '',
      size: 0,
      url: a.path || a.pathName || undefined,
    })),
    link: undefined,
    isConfidential: dto.isConfidential ?? false,
    isApprovalRequired: dto.isApprovalRequired ?? false,
    status,
    cancelledReason: dto.cancelledReason || undefined,
    rejectReason: dto.rejectReason || getApproval(dto)?.rejectReason || undefined,
    timeline: buildTimeline(status, dto),
  };
};

export const mapCalendarItemToLeadershipRequest = (item: IScheduleOccurrenceCalendarItem): ScheduleRequest => {
  const start = fromApiDateTime(item.startDate);
  const end = fromApiDateTime(item.endDate);
  const durationMinutes = Math.max(0, end.hour() * 60 + end.minute() - (start.hour() * 60 + start.minute()));
  const status = STATUS_BY_VALUE[item.status] || 'pending';

  return {
    id: item.id,
    code: item.code || '',
    scheduleId: item.id,
    isGroupSchedule: false,
    executiveId: '',
    title: item.title || '',
    description: undefined,
    durationMinutes,
    date: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
    startTime: start.format('HH:mm'),
    endTime: end.format('HH:mm'),
    location: item.location || '',
    scheduleTypeId: item.scheduleTypeId || undefined,
    scheduleTypeName: item.scheduleTypeName || undefined,
    meetingFormat: MEETING_FORMAT_BY_TYPE[item.meetingType] || 'offline',
    priority: PRIORITY_BY_VALUE[item.priority] || 'normal',
    requester: {
      id: '',
      name: '',
    },
    participants: [],
    isConfidential: false,
    isApprovalRequired: false,
    status,
    timeline: [{ key: TIMELINE_KEY_BY_STATUS[status], at: start.toISOString() }],
  };
};

export const getDisplayStatus = (request: Pick<ScheduleRequest, 'status' | 'endDate' | 'endTime'>): RequestStatus =>
  request.status;

export const meetingTypeFromFormat = (format: MeetingFormat): MeetingType => MEETING_TYPE_BY_FORMAT[format];

export const priorityValueFromUi = (priority: UiSchedulePriority): SchedulePriority =>
  PRIORITY_VALUE_BY_UI[priority] ?? SchedulePriority.Normal;

const combineDateTime = toApiDateTime;

const appendField = (fd: FormData, key: string, value: string | number | boolean | undefined | null) => {
  if (value === undefined || value === null || value === '') return;
  fd.append(key, typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value));
};

export const buildCreateLeadershipOccurrenceFormData = (
  input: LeadershipRequestInput,
  ownerUserId: string | undefined,
  isDraft: boolean
): FormData => {
  const fd = new FormData();
  appendField(fd, 'OwnerUserId', ownerUserId);
  appendField(fd, 'LeaderUserId', input.executiveId);
  appendField(fd, 'ScheduleCategory', ScheduleCategory.LeaderRegistration);
  appendField(fd, 'IsDraft', isDraft);
  const isSingleDay = input.isSingleDay ?? (input.date === input.endDate);
  const isMultiDay = input.isMultiDay ?? (input.date !== input.endDate);
  appendField(fd, 'StartDate', combineDateTime(input.date, input.startTime));
  appendField(fd, 'EndDate', combineDateTime(input.endDate, input.endTime));
  appendField(fd, 'IsSingleDay', isSingleDay);
  appendField(fd, 'IsMultiDay', isMultiDay);
  appendField(fd, 'ScheduleTypeId', input.scheduleTypeId);
  appendField(fd, 'Title', input.title);
  appendField(fd, 'Location', input.location);
  appendField(fd, 'MeetingType', input.meetingFormat ? MEETING_TYPE_BY_FORMAT[input.meetingFormat] : undefined);
  appendField(fd, 'Priority', input.priority ? priorityValueFromUi(input.priority) : undefined);
  appendField(fd, 'DetailContent', input.description);
  appendField(fd, 'Note', input.note);
  appendField(fd, 'IsSendEmail', true);
  appendField(fd, 'IsConfidential', input.isConfidential ?? false);
  appendField(fd, 'IsApprovalRequired', input.isApprovalRequired ?? false);

  (input.link ? input.link.split('\n').filter(Boolean) : []).forEach((link) => fd.append('AttachmentLinks', link));
  input.participants.forEach((p) => fd.append('ParticipantIds', p.id));
  (input.attachments || []).forEach((a) => {
    if (a.file) fd.append('AttachmentFiles', a.file);
  });

  return fd;
};

export const buildUpdateLeadershipOccurrenceFormData = (
  input: LeadershipRequestInput,
  ownerUserId: string | undefined,
  isDraft?: boolean
): FormData => {
  const fd = new FormData();
  appendField(fd, 'OwnerUserId', ownerUserId);
  appendField(fd, 'LeaderUserId', input.executiveId);
  appendField(fd, 'ScheduleCategory', ScheduleCategory.LeaderRegistration);
  if (isDraft !== undefined) appendField(fd, 'IsDraft', isDraft);
  const isSingleDay = input.isSingleDay ?? (input.date === input.endDate);
  const isMultiDay = input.isMultiDay ?? (input.date !== input.endDate);
  appendField(fd, 'StartDate', combineDateTime(input.date, input.startTime));
  appendField(fd, 'EndDate', combineDateTime(input.endDate, input.endTime));
  appendField(fd, 'IsSingleDay', isSingleDay);
  appendField(fd, 'IsMultiDay', isMultiDay);
  appendField(fd, 'IsUpdateSingleDay', isSingleDay);
  appendField(fd, 'ScheduleTypeId', input.scheduleTypeId);
  appendField(fd, 'Title', input.title);
  appendField(fd, 'Location', input.location);
  appendField(fd, 'MeetingType', input.meetingFormat ? MEETING_TYPE_BY_FORMAT[input.meetingFormat] : undefined);
  appendField(fd, 'Priority', input.priority ? priorityValueFromUi(input.priority) : undefined);
  appendField(fd, 'DetailContent', input.description);
  appendField(fd, 'Note', input.note);
  appendField(fd, 'IsSendEmail', true);
  appendField(fd, 'IsConfidential', input.isConfidential ?? false);
  appendField(fd, 'IsApprovalRequired', input.isApprovalRequired ?? false);

  (input.link ? input.link.split('\n').filter(Boolean) : []).forEach((link) => fd.append('AttachmentLinks', link));
  input.participants.forEach((p) => fd.append('ParticipantIds', p.id));
  (input.attachments || []).forEach((a) => {
    if (a.file) fd.append('AttachmentFiles', a.file);
    else fd.append('AttachmentIds', a.id);
  });

  return fd;
};

import React, { useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { DatePicker, TimePicker, Select as AntdSelect, Modal } from 'antd';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Sparkles,
  Building2,
  Video,
  Mail,
  Phone,
  Link2,
  Trash2,
  CalendarDays,
  CalendarRange,
  FileText,
  Users,
  MapPin,
  Save,
  CalendarPlus,
  X,
  ArrowRight,
  Lock,
  UserPlus,
} from 'lucide-react';
import { ParticipationStatus } from '../../../../constants/participationStatus';
import {
  FormModal,
  FormModalHeader,
  FormModalBody,
  FormModalFooter,
  FormSectionCard,
  formFieldLabel as fieldLabel,
} from '../../../../components/ui/FormModal';
import { ConfirmModal } from '../../../../components/ui/ConfirmModal';
import { PagedPickerSelect } from '../../../../components/ui/PagedPickerSelect';
import { DepartmentTreeSelect } from '../../../../components/shared/DepartmentTreeSelect';
import { FileAttachmentInput, type AttachmentFile } from '../../../../components/ui/FileAttachmentInput';
import { withPriorityColor } from '../../../../components/ui/PriorityOption';
import { userAPI } from '../../../../services/api/userAPI';
import { useAuthStore } from '../../../../store/authStore';
import { useActingLeaderStore } from '../../../../store/actingLeaderStore';
import { useScheduleTypesQuery } from '../../../categories/meeting-type/hooks/useScheduleTypeQueries';
import type { Employee } from '../../../system/types';
import { cn } from '../../../../utils/helpers';
import { QUILL_FONT_OPTIONS } from '../../../../utils/quillConfig';
import { findConflict, suggestFreeSlots, type FreeSlot } from '../utils/conflict';
import { buildDayAvailabilitySlots, markSlotsBusyFromLocalEvents } from '../utils/availabilitySlots';
import { useDayAvailabilityQuery, type DayAvailabilityExclude } from '../hooks/useDayAvailabilityQuery';
import { PersonalTimeSlotPicker } from './PersonalTimeSlotPicker';
import { DURATION_OPTIONS } from '../../DangKyLichLanhDao/types';
import { isRangeAvailable, rankSuggestedSlots } from '../../DangKyLichLanhDao/utils/timeSlots';
import type { MeetingFormat, PersonalScheduleEvent, SchedulePriority, ScheduleParticipant } from '../types';
import { usePersonalScheduleDetailQuery, type PersonalScheduleInput } from '../hooks/usePersonalCalendarQueries';

const initialsOf = (name: string) =>
  name?.split(' ').filter(Boolean).slice(-2).map((n) => n[0]).join('').toUpperCase() || '?';

const inputClass =
  'w-full h-[40px] px-3.5 rounded-xl border bg-white dark:bg-slate-900 dark:text-slate-100 text-sm transition-all duration-200 focus:outline-none focus:ring-4 border-slate-200 dark:border-slate-700 hover:border-[#00529C] focus:border-[#00529C] focus:ring-[#00529C]/10 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:text-13 placeholder:font-normal';

const textareaClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 resize-none transition-all duration-200 hover:border-[#00529C] focus:border-[#00529C] focus:outline-none focus:ring-4 focus:ring-[#00529C]/10 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:text-13 placeholder:font-normal';

const PRIORITY_OPTIONS = [
  { value: 'urgent' as const, labelKey: 'personal_calendar.priority_urgent' },
  { value: 'normal' as const, labelKey: 'personal_calendar.priority_normal' },
];

const MEETING_FORMAT_OPTIONS = [
  { value: 'offline' as const, labelKey: 'personal_calendar.format_offline', icon: Building2 },
  { value: 'online' as const, labelKey: 'personal_calendar.format_online', icon: Video },
];

interface FormValues {
  title: string;
  isMultiDay: boolean;
  dateRange: [Dayjs, Dayjs] | null;
  startTime: Dayjs | null;
  endTime: Dayjs | null;
  durationMinutes: number;
  location: string;
  scheduleTypeId: string;
  meetingFormat: MeetingFormat;
  priority: SchedulePriority;
  participants: ScheduleParticipant[];
  content: string;
  note: string;
  attachments: AttachmentFile[];
  links: string[];
  isSendEmail: boolean;
  isConfidential: boolean;
  isApprovalRequired: boolean;
}

const getDefaultTimeRange = () => {
  const now = dayjs().second(0).millisecond(0);
  const remainder = now.minute() % 5;
  const startTime = remainder === 0 ? now : now.add(5 - remainder, 'minute');
  return { startTime, endTime: startTime.add(1, 'hour') };
};

const buildEmptyValues = (initialSlot?: { date?: Dayjs; startTime?: Dayjs; endTime?: Dayjs } | null): FormValues => {
  const defaultTimes = getDefaultTimeRange();
  const date = initialSlot?.date || dayjs();
  const startTime = initialSlot?.startTime || defaultTimes.startTime;
  const endTime = initialSlot?.endTime || defaultTimes.endTime;
  return {
    title: '',
    isMultiDay: false,
    dateRange: [date, date],
    startTime,
    endTime,
    durationMinutes: Math.max(15, endTime.diff(startTime, 'minute')),
    location: '',
    scheduleTypeId: '',
    meetingFormat: 'offline',
    priority: 'normal',
    participants: [],
    content: '',
    note: '',
    attachments: [],
    links: [''],
    isSendEmail: false,
    isConfidential: false,
    isApprovalRequired: false,
  };
};

const buildValuesFromEvent = (event: PersonalScheduleEvent): FormValues => ({
  title: event.title,
  isMultiDay: event.startDate !== event.endDate,
  dateRange: [dayjs(event.startDate), dayjs(event.endDate)],
  startTime: dayjs(event.startTime, 'HH:mm'),
  endTime: dayjs(event.endTime, 'HH:mm'),
  durationMinutes: Math.max(15, dayjs(event.endTime, 'HH:mm').diff(dayjs(event.startTime, 'HH:mm'), 'minute')),
  location: event.location,
  scheduleTypeId: event.scheduleTypeId,
  meetingFormat: event.meetingFormat,
  priority: event.priority,
  participants: event.participants,
  content: event.content,
  note: event.note || '',
  attachments: event.attachments,
  links: event.link ? event.link.split('\n').filter(Boolean) : [''],
  isSendEmail: event.isSendEmail,
  isConfidential: event.isConfidential,
  isApprovalRequired: event.isApprovalRequired,
});

export interface PersonalScheduleModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (input: PersonalScheduleInput, options?: { isDraft?: boolean; isUpdateSingleDay?: boolean }) => void;
  editing?: PersonalScheduleEvent | null;
  duplicateFrom?: PersonalScheduleEvent | null;
  initialSlot?: { date?: Dayjs; startTime?: Dayjs; endTime?: Dayjs } | null;
  existingEvents: PersonalScheduleEvent[];
  loading?: boolean;
}

type FormErrors = Partial<Record<'title' | 'dateRange' | 'startTime' | 'endTime' | 'location' | 'scheduleTypeId' | 'content', string>>;

const isContentEmpty = (html: string) => !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

const dayEq = (a: Dayjs | null, b: Dayjs | null) => (a?.valueOf() ?? null) === (b?.valueOf() ?? null);

const valuesEqual = (a: FormValues, b: FormValues): boolean =>
  a.title === b.title &&
  a.isMultiDay === b.isMultiDay &&
  dayEq(a.dateRange?.[0] ?? null, b.dateRange?.[0] ?? null) &&
  dayEq(a.dateRange?.[1] ?? null, b.dateRange?.[1] ?? null) &&
  dayEq(a.startTime, b.startTime) &&
  dayEq(a.endTime, b.endTime) &&
  a.durationMinutes === b.durationMinutes &&
  a.location === b.location &&
  a.scheduleTypeId === b.scheduleTypeId &&
  a.meetingFormat === b.meetingFormat &&
  a.priority === b.priority &&
  a.content === b.content &&
  a.note === b.note &&
  a.isSendEmail === b.isSendEmail &&
  a.isConfidential === b.isConfidential &&
  a.isApprovalRequired === b.isApprovalRequired &&
  a.participants.length === b.participants.length &&
  a.participants.every((p, i) => p.id === b.participants[i]?.id) &&
  a.attachments.length === b.attachments.length &&
  a.attachments.every((x, i) => !x.file && x.id === b.attachments[i]?.id) &&
  a.links.length === b.links.length &&
  a.links.every((l, i) => l === b.links[i]);

export const PersonalScheduleModal: React.FC<PersonalScheduleModalProps> = ({
  open,
  onCancel,
  onSubmit,
  editing,
  duplicateFrom,
  initialSlot,
  existingEvents,
  loading,
}) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<FormValues>(() => buildEmptyValues(initialSlot));
  const [errors, setErrors] = useState<FormErrors>({});
  const [baseline, setBaseline] = useState<FormValues | null>(null);

  const resetKey = `${open}|${editing?.id ?? ''}|${duplicateFrom?.id ?? ''}|${initialSlot?.date?.format('YYYY-MM-DD') ?? ''}|${initialSlot?.startTime?.format('HH:mm') ?? ''}|${initialSlot?.endTime?.format('HH:mm') ?? ''}`;
  const [lastResetKey, setLastResetKey] = useState('');
  if (open && resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    const loaded = editing
      ? buildValuesFromEvent(editing)
      : duplicateFrom
      ? buildValuesFromEvent(duplicateFrom)
      : buildEmptyValues(initialSlot);
    setValues(loaded);
    setBaseline(loaded);
    setErrors({});
  } else if (!open && lastResetKey !== '') {
    setLastResetKey('');
  }

  const { data: editingDetail } = usePersonalScheduleDetailQuery(editing?.id, open && !!editing);
  useEffect(() => {
    if (editingDetail && editingDetail.id === editing?.id) {
      const loaded = buildValuesFromEvent(editingDetail);
      setValues(loaded);
      setBaseline(loaded);
    }
  }, [editingDetail]);

  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [participantDepartmentId, setParticipantDepartmentId] = useState<string | null>(null);

  const activeEvent = editingDetail && editingDetail.id === editing?.id ? editingDetail : editing;
  const initialParticipants = useMemo(() => activeEvent?.participants ?? [], [activeEvent]);
  const initialParticipantIds = useMemo(() => new Set(initialParticipants.map((p) => p.id)), [initialParticipants]);

  const hasRespondedParticipants = useMemo(() => {
    if (!activeEvent || !initialParticipants.length) return false;
    return initialParticipants.some((p) => {
      const s = p.status;
      return (
        s === ParticipationStatus.Accepted ||
        s === ParticipationStatus.Reject ||
        String(s).toLowerCase() === 'accepted' ||
        String(s).toLowerCase() === 'reject' ||
        String(s).toLowerCase() === 'rejected'
      );
    });
  }, [activeEvent, initialParticipants]);

  const { data: scheduleTypesData } = useScheduleTypesQuery({ PageSize: 20 }, { enabled: open });
  const scheduleTypeOptions = useMemo(
    () => (scheduleTypesData?.items || []).map((st) => ({ value: st.id, label: st.name })),
    [scheduleTypesData]
  );
  const priorityOptions = useMemo(
    () => withPriorityColor(PRIORITY_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))),
    [t]
  );

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }, { font: QUILL_FONT_OPTIONS }, { size: [] }],
        ['bold', 'italic', 'underline', 'strike', { color: [] }, { background: [] }],
        [{ script: 'sub' }, { script: 'super' }, { list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }, { align: [] }],
        ['blockquote', 'code-block', 'link', 'image'],
        ['clean'],
      ],
    }),
    []
  );

  const activeEvents = useMemo(() => existingEvents.filter((ev) => ev.status !== 'cancelled'), [existingEvents]);

  const conflictCandidate = useMemo(() => {
    if (!values.dateRange || !values.startTime || !values.endTime) return null;
    return {
      startDate: values.dateRange[0].format('YYYY-MM-DD'),
      endDate: values.dateRange[1].format('YYYY-MM-DD'),
      startTime: values.startTime.format('HH:mm'),
      endTime: values.endTime.format('HH:mm'),
    };
  }, [values.dateRange, values.startTime, values.endTime]);

  const namedConflict = useMemo(() => {
    if (!conflictCandidate) return null;
    return findConflict(conflictCandidate, activeEvents, editing?.id);
  }, [conflictCandidate, activeEvents, editing]);

  const currentUserId = useAuthStore((s) => s.user?.id);
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  const ownerUserId = actingLeaderId || currentUserId;

  const dayAvailabilityUserIds = useMemo(() => (ownerUserId ? [ownerUserId] : []), [ownerUserId]);
  const dayAvailabilityExclude = useMemo<DayAvailabilityExclude | undefined>(() => {
    if (!editing) return undefined;
    return editing.isGroupSchedule ? { scheduleId: editing.scheduleId } : { scheduleOccurrenceId: editing.id };
  }, [editing]);
  const slotDate = values.dateRange?.[0]?.format('YYYY-MM-DD');
  const { data: dayAvailability, isFetching: daySlotsLoading } = useDayAvailabilityQuery(
    dayAvailabilityUserIds,
    slotDate,
    open,
    dayAvailabilityExclude
  );
  const daySlots = useMemo(() => {
    if (!dayAvailability || !slotDate) return [];
    const base = buildDayAvailabilitySlots(dayAvailability, slotDate);
    return markSlotsBusyFromLocalEvents(base, activeEvents, slotDate, editing?.id);
  }, [dayAvailability, slotDate, activeEvents, editing]);

  const hasConflict = useMemo(() => {
    if (!conflictCandidate || !slotDate) return false;
    if (namedConflict) return true;
    if (!daySlots.length) return false;
    return !isRangeAvailable(daySlots, conflictCandidate.startTime, values.durationMinutes);
  }, [conflictCandidate, slotDate, namedConflict, daySlots, values.durationMinutes]);

  const suggestions = useMemo<FreeSlot[]>(() => {
    if (!hasConflict || !conflictCandidate) return [];
    if (daySlots.length) {
      return rankSuggestedSlots(daySlots, values.durationMinutes, 2).map((start) => ({
        start,
        end: dayjs(start, 'HH:mm').add(values.durationMinutes, 'minute').format('HH:mm'),
      }));
    }
    return suggestFreeSlots(conflictCandidate, activeEvents, editing?.id);
  }, [hasConflict, conflictCandidate, daySlots, values.durationMinutes, activeEvents, editing]);

  const handleSlotDateChange = (dateStr: string) => {
    const next = dayjs(dateStr);
    setValues((prev) => {
      if (!prev.dateRange) return { ...prev, dateRange: [next, next] };
      const currentEnd = prev.dateRange[1];
      const nextEnd = prev.isMultiDay && currentEnd.isAfter(next) ? currentEnd : next;
      return { ...prev, dateRange: [next, nextEnd] };
    });
  };

  const handleSelectSlot = (start: string) => {
    if (!start) {
      setValues((prev) => ({
        ...prev,
        startTime: null,
        endTime: null,
      }));
      return;
    }
    setValues((prev) => {
      if (prev.startTime && prev.startTime.format('HH:mm') === start) {
        return {
          ...prev,
          startTime: null,
          endTime: null,
        };
      }
      return {
        ...prev,
        startTime: dayjs(start, 'HH:mm'),
        endTime: dayjs(start, 'HH:mm').add(prev.durationMinutes, 'minute'),
      };
    });
    setErrors((prev) => ({ ...prev, startTime: undefined, endTime: undefined }));
  };

  const disabledPastDate = (current: Dayjs) => current.isBefore(dayjs(), 'day');

  const disabledPastTime = (date: Dayjs | null | undefined) => {
    if (!date || !date.isSame(dayjs(), 'day')) return {};
    const now = dayjs();
    return {
      disabledHours: () => Array.from({ length: now.hour() }, (_, i) => i),
      disabledMinutes: (selectedHour: number) =>
        selectedHour === now.hour() ? Array.from({ length: now.minute() }, (_, i) => i) : [],
    };
  };

  const applySuggestion = (slot: FreeSlot) => {
    setValues((prev) => ({
      ...prev,
      startTime: dayjs(slot.start, 'HH:mm'),
      endTime: dayjs(slot.end, 'HH:mm'),
    }));
  };

  const initialParticipantRecords = useMemo<Employee[]>(() => {
    return values.participants.map((p) => ({
      id: p.id,
      username: p.id,
      fullname: p.name,
      email: p.email ?? null,
      employeeCode: p.code ?? null,
    }));
  }, [values.participants]);

  const fetchParticipants = async ({ search, page, pageSize }: { search: string; page: number; pageSize: number }) => {
    const res = await userAPI.getUsers({
      searchKeyword: search,
      PageNumber: page,
      PageSize: pageSize,
      departmentId: participantDepartmentId || undefined,
    });
    return { items: (res.items || []) as Employee[], total: res.totalCount || 0 };
  };

  /** Shared by the full submit and the draft save — a draft tolerates a cleared date/time, so those
   *  fall back to sensible defaults instead of being required. */
  const buildInputFromValues = (): PersonalScheduleInput => {
    const { startTime: defaultStart, endTime: defaultEnd } = getDefaultTimeRange();
    const dateRange = values.dateRange ?? [dayjs(), dayjs()];
    const startTime = values.startTime ?? defaultStart;
    const endTime = values.endTime ?? defaultEnd;
    return {
      title: values.title.trim(),
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
      startTime: startTime.format('HH:mm'),
      endTime: endTime.format('HH:mm'),
      isSingleDay: !values.isMultiDay,
      isMultiDay: values.isMultiDay,
      location: values.location.trim(),
      scheduleTypeId: values.scheduleTypeId,
      meetingFormat: values.meetingFormat,
      priority: values.priority,
      status: editing?.status ?? 'created',
      participants: values.participants,
      content: values.content,
      note: values.note.trim() || undefined,
      attachments: values.attachments,
      link: values.links.map((l) => l.trim()).filter(Boolean).join('\n') || undefined,
      isSendEmail: values.isSendEmail,
      isConfidential: values.isConfidential,
      isApprovalRequired: values.isApprovalRequired,
    };
  };

  const handleSubmit = () => {
    const nextErrors: FormErrors = {};
    const now = dayjs();
    if (!values.title.trim()) nextErrors.title = t('personal_calendar.title_required');
    if (!values.dateRange) nextErrors.dateRange = t('personal_calendar.date_range_required');
    if (!hasRespondedParticipants) {
      if (values.dateRange && values.dateRange[0].isBefore(now, 'day')) {
        nextErrors.dateRange = t('personal_calendar.date_range_past_invalid');
      }
    }
    if (!values.startTime) nextErrors.startTime = t('personal_calendar.start_time_required');
    if (!values.endTime) nextErrors.endTime = t('personal_calendar.end_time_required');
    if (!hasRespondedParticipants) {
      if (values.startTime && values.dateRange?.[0]?.isSame(now, 'day') && values.startTime.isBefore(now)) {
        nextErrors.startTime = t('personal_calendar.start_time_past_invalid');
      }
      if (values.endTime && values.dateRange?.[1]?.isSame(now, 'day') && values.endTime.isBefore(now)) {
        nextErrors.endTime = t('personal_calendar.end_time_past_invalid');
      }
    }
    if (values.startTime && values.endTime && !values.endTime.isAfter(values.startTime)) {
      nextErrors.endTime = t('personal_calendar.time_range_invalid');
    }
    if (!values.location.trim()) nextErrors.location = t('personal_calendar.location_required');
    if (!values.scheduleTypeId) nextErrors.scheduleTypeId = t('personal_calendar.category_required');
    if (isContentEmpty(values.content)) nextErrors.content = t('personal_calendar.content_required');

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submit(false);
  };

  const isFormDirty = () => {
    if (!editing) {
      return (
        !!values.title.trim() ||
        !!values.location.trim() ||
        !!values.scheduleTypeId ||
        values.participants.length > 0 ||
        !!values.content.replace(/<[^>]*>/g, '').trim() ||
        !!values.note.trim() ||
        values.attachments.length > 0 ||
        values.links.some((l) => l.trim())
      );
    }
    return !!baseline && !valuesEqual(values, baseline);
  };

  const handleSaveDraft = () => {
    if (!values.title.trim()) {
      setErrors((prev) => ({ ...prev, title: t('personal_calendar.title_required') }));
      return;
    }
    submit(true);
  };

  const currentEditing = editingDetail && editingDetail.id === editing?.id ? editingDetail : editing;
  const needsUpdateScopeChoice = !!currentEditing && (currentEditing.isGroupSchedule === true || currentEditing.startDate !== currentEditing.endDate);
  const [pendingSubmit, setPendingSubmit] = useState<{ isDraft: boolean } | null>(null);

  const submit = (isDraft: boolean) => {
    // Group schedules must also ask: the form only shows the edited occurrence's date (so "Lặp lại"
    // looks unchecked), and silently updating every day would surprise the user.
    if (needsUpdateScopeChoice) {
      setPendingSubmit({ isDraft });
      return;
    }
    onSubmit(buildInputFromValues(), { isDraft });
  };

  const confirmUpdateScope = (isUpdateSingleDay: boolean) => {
    if (!pendingSubmit) return;
    onSubmit(buildInputFromValues(), { isDraft: pendingSubmit.isDraft, isUpdateSingleDay });
    setPendingSubmit(null);
  };

  const isDraftEligible = !editing || editing.status === 'draft';

  const handleRequestClose = () => {
    if (isDraftEligible && isFormDirty()) {
      setShowDraftPrompt(true);
      return;
    }
    onCancel();
  };

  const requiredMark = <span className="text-red-500">*</span>;

  return (
    <>
    <FormModal open={open} onCancel={onCancel} width="80vw" centered>
      <FormModalHeader
        title={editing ? t('personal_calendar.modal_edit_title') : t('personal_calendar.modal_add_title')}
        subtitle={editing ? t('personal_calendar.modal_edit_subtitle') : t('personal_calendar.modal_add_subtitle')}
        icon={<CalendarDays size={22} className="text-white" />}
        iconClassName="bg-gradient-to-br from-blue-400 to-blue-500 shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5)]"
        onClose={handleRequestClose}
      />

      <FormModalBody>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
          <div className="flex flex-col gap-4 min-w-0 h-full">
            <FormSectionCard number={1} title={t('personal_calendar.section_general')} icon={<FileText size={15} />}>
              <div className="flex flex-col flex-1 gap-3">
              {hasRespondedParticipants && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-300 text-12.5 mb-1 select-none">
                  <Lock size={15} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1 leading-snug">
                    <span className="font-semibold">{t('personal_calendar.locked_step1_title', { defaultValue: 'Thông tin chung đã khóa:' })}</span>
                    <span className="ml-1 text-amber-700/90 dark:text-amber-300/90">
                      {t('personal_calendar.locked_step1_desc', {
                        defaultValue: 'Lịch đã có thành phần tham gia xác nhận hoặc từ chối. Bạn chỉ có thể bổ sung thêm thành phần tham dự (Bước 2) và chỉnh sửa nội dung, tài liệu (Bước 3).',
                      })}
                    </span>
                  </div>
                </div>
              )}
              {/* Row 1: Title + Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1">
                      {fieldLabel(t('personal_calendar.field_title'))}
                      {requiredMark}
                    </span>
                    {errors.title && <span className="text-xs font-medium text-red-500">{errors.title}</span>}
                  </div>
                  <input
                    disabled={hasRespondedParticipants}
                    value={values.title}
                    onChange={(e) => {
                      setValues((prev) => ({ ...prev, title: e.target.value }));
                      setErrors((prev) => ({ ...prev, title: undefined }));
                    }}
                    placeholder={t('personal_calendar.title_placeholder')}
                    className={cn(
                      inputClass,
                      errors.title && '!border-red-500 ring-red-500/10',
                      hasRespondedParticipants && '!bg-slate-100 dark:!bg-slate-800/60 !cursor-not-allowed !text-slate-500'
                    )}
                  />
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  {fieldLabel(t('personal_calendar.field_priority'))}
                  <AntdSelect
                    disabled={hasRespondedParticipants}
                    size="large"
                    value={values.priority}
                    onChange={(v) => setValues((prev) => ({ ...prev, priority: v }))}
                    options={priorityOptions}
                    className="w-[200px] premium-select h-10 font-medium"
                    classNames={{ popup: { root: 'premium-select-dropdown' } }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 mt-3">
                <span className="text-13 font-medium text-slate-600 dark:text-slate-300">
                  {t('personal_calendar.field_form_type')}:
                </span>
                <label
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border select-none transition-colors',
                    hasRespondedParticipants ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                    values.isMultiDay
                      ? 'border-[#00529C]/30 bg-[#00529C]/5 dark:border-blue-500/30 dark:bg-blue-500/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-[#00529C]/30'
                  )}
                  title={t('personal_calendar.field_multi_day_hint')}
                >
                  <input
                    disabled={hasRespondedParticipants}
                    type="checkbox"
                    checked={values.isMultiDay}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setValues((prev) => ({
                        ...prev,
                        isMultiDay: checked,
                        dateRange: prev.dateRange && !checked ? [prev.dateRange[0], prev.dateRange[0]] : prev.dateRange,
                      }));
                    }}
                    className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 text-[#00529C] focus:ring-[#00529C]/30 cursor-pointer"
                  />
                  <span
                    className={cn(
                      'text-12.5 font-semibold',
                      values.isMultiDay ? 'text-[#00529C] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {t('personal_calendar.field_multi_day')}
                  </span>
                </label>
              </div>

              <div
                className={cn(
                  'grid gap-3 mt-3',
                  values.isMultiDay ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'
                )}
              >
                {values.isMultiDay ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <span className="inline-flex items-center gap-1">
                        {fieldLabel(t('personal_calendar.field_date_from'))}
                        {requiredMark}
                      </span>
                      <DatePicker
                        disabled={hasRespondedParticipants}
                        size="large"
                        className="w-full"
                        status={errors.dateRange ? 'error' : undefined}
                        value={values.dateRange?.[0] ?? null}
                        format="DD/MM/YYYY"
                        disabledDate={disabledPastDate}
                        onChange={(d) => {
                          if (!d) return;
                          setValues((prev) => ({
                            ...prev,
                            dateRange: [d, prev.dateRange && prev.dateRange[1].isAfter(d) ? prev.dateRange[1] : d],
                          }));
                          setErrors((prev) => ({ ...prev, dateRange: undefined }));
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="inline-flex items-center gap-1">
                        {fieldLabel(t('personal_calendar.field_date_to'))}
                        {requiredMark}
                      </span>
                      <DatePicker
                        disabled={hasRespondedParticipants}
                        size="large"
                        className="w-full"
                        status={errors.dateRange ? 'error' : undefined}
                        value={values.dateRange?.[1] ?? null}
                        format="DD/MM/YYYY"
                        disabledDate={(d) => d.isBefore(values.dateRange?.[0] ?? dayjs(), 'day')}
                        onChange={(d) => {
                          if (!d) return;
                          setValues((prev) => ({ ...prev, dateRange: [prev.dateRange?.[0] ?? d, d] }));
                          setErrors((prev) => ({ ...prev, dateRange: undefined }));
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="inline-flex items-center gap-1">
                      {fieldLabel(t('personal_calendar.field_date_single'))}
                      {requiredMark}
                    </span>
                    <DatePicker
                      disabled={hasRespondedParticipants}
                      size="large"
                      className="w-full"
                      status={errors.dateRange ? 'error' : undefined}
                      value={values.dateRange?.[0] ?? null}
                      format="DD/MM/YYYY"
                      disabledDate={disabledPastDate}
                      onChange={(d) => {
                        setValues((prev) => ({ ...prev, dateRange: d ? [d, d] : null }));
                        setErrors((prev) => ({ ...prev, dateRange: undefined }));
                      }}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    {fieldLabel(t('personal_calendar.field_start_time'))}
                    {requiredMark}
                  </span>
                  <TimePicker
                    disabled={hasRespondedParticipants}
                    size="large"
                    className="w-full"
                    status={errors.startTime ? 'error' : undefined}
                    value={values.startTime}
                    format="HH:mm"
                    minuteStep={5}
                    disabledTime={() => disabledPastTime(values.dateRange?.[0])}
                    onChange={(time) => {
                      setValues((prev) => ({
                        ...prev,
                        startTime: time,
                        endTime: time ? time.add(prev.durationMinutes, 'minute') : prev.endTime,
                      }));
                      setErrors((prev) => ({ ...prev, startTime: undefined, endTime: undefined }));
                    }}
                  />
                  {errors.startTime && <span className="text-xs font-medium text-red-500 pl-1">{errors.startTime}</span>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    {fieldLabel(t('personal_calendar.field_end_time'))}
                    {requiredMark}
                  </span>
                  <TimePicker
                    disabled={hasRespondedParticipants}
                    size="large"
                    className="w-full"
                    status={errors.endTime ? 'error' : undefined}
                    value={values.endTime}
                    format="HH:mm"
                    minuteStep={5}
                    disabledTime={() => disabledPastTime(values.dateRange?.[1])}
                    onChange={(time) => {
                      setValues((prev) => {
                        const diff = time && prev.startTime ? time.diff(prev.startTime, 'minute') : 0;
                        return { ...prev, endTime: time, durationMinutes: diff > 0 ? diff : prev.durationMinutes };
                      });
                      setErrors((prev) => ({ ...prev, endTime: undefined }));
                    }}
                  />
                  {errors.endTime && <span className="text-xs font-medium text-red-500 pl-1">{errors.endTime}</span>}
                </div>
              </div>
              {errors.dateRange && <span className="text-xs font-medium text-red-500 pl-1">{errors.dateRange}</span>}

              {!hasRespondedParticipants && values.dateRange && (
                <div className="mt-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        <Sparkles size={16} />
                      </div>
                      <span className="text-13 font-bold text-slate-800 dark:text-slate-100">
                        {t('personal_calendar.field_time_slot') || 'Thời gian đề xuất'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-12 text-slate-400 dark:text-slate-500 font-normal">
                        {t('personal_calendar.field_duration') || 'Thời lượng'}:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {DURATION_OPTIONS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() =>
                              setValues((prev) => ({
                                ...prev,
                                durationMinutes: d,
                                endTime: prev.startTime ? prev.startTime.add(d, 'minute') : prev.endTime,
                              }))
                            }
                            className={cn(
                              'h-7 px-3 rounded-full text-12 font-medium cursor-pointer transition-all duration-200 border select-none',
                              values.durationMinutes === d
                                ? 'border-[#00529C]/50 dark:border-blue-400/70 bg-blue-50/70 dark:bg-blue-950/40 text-[#00529C] dark:text-blue-400 font-bold shadow-xs hover:bg-blue-100/80 hover:border-[#00529C]/70'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-[#00529C]/40 hover:bg-blue-50/50 hover:text-[#00529C] hover:shadow-2xs'
                            )}
                          >
                            {t('personal_calendar.duration_minutes', { count: d })}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <PersonalTimeSlotPicker
                    slots={daySlots}
                    loading={daySlotsLoading}
                    date={slotDate!}
                    onDateChange={handleSlotDateChange}
                    durationMinutes={values.durationMinutes}
                    selectedStart={values.startTime?.format('HH:mm')}
                    onSelectStart={handleSelectSlot}
                  />
                </div>
              )}

              {hasConflict && (
                <div className="rounded-xl border border-dashed border-red-300 dark:border-red-800/60 bg-red-50/70 dark:bg-red-950/20 px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={16} className="shrink-0 text-red-500 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-13 font-semibold text-red-600 dark:text-red-400">
                        {t('personal_calendar.conflict_warning_title')}
                      </div>
                      <div className="text-13 text-red-500 dark:text-red-400/90 mt-0.5">
                        {namedConflict
                          ? t('personal_calendar.conflict_warning_detail', {
                              title: namedConflict.event.title,
                              start: namedConflict.event.startTime,
                              end: namedConflict.event.endTime,
                            })
                          : t('personal_calendar.conflict_warning_detail_generic', {
                              defaultValue: 'Khung giờ này đã có lịch khác, vui lòng chọn giờ khác.',
                            })}
                      </div>
                      {suggestions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-2.5">
                          <span className="inline-flex items-center gap-1 text-11.5 font-medium text-slate-500 dark:text-slate-400">
                            <Sparkles size={12} />
                            {t('personal_calendar.conflict_suggestion_label')}
                          </span>
                          {suggestions.map((slot) => (
                            <button
                              key={`${slot.start}-${slot.end}`}
                              type="button"
                              onClick={() => applySuggestion(slot)}
                              className="px-2.5 py-1 rounded-full border border-[#00529C]/30 dark:border-blue-400/30 bg-white dark:bg-slate-900 text-11.5 font-semibold text-[#00529C] dark:text-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                            >
                              {slot.start} - {slot.end}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    {fieldLabel(t('personal_calendar.field_location'))}
                    {requiredMark}
                  </span>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00529C] dark:text-blue-400 pointer-events-none" />
                    <input
                      disabled={hasRespondedParticipants}
                      value={values.location}
                      onChange={(e) => {
                        setValues((prev) => ({ ...prev, location: e.target.value }));
                        setErrors((prev) => ({ ...prev, location: undefined }));
                      }}
                      placeholder={t('personal_calendar.location_placeholder')}
                      className={cn(
                        inputClass,
                        'pl-9',
                        errors.location && '!border-red-500 ring-red-500/10',
                        hasRespondedParticipants && '!bg-slate-100 dark:!bg-slate-800/60 !cursor-not-allowed !text-slate-500'
                      )}
                    />
                  </div>
                  {errors.location && <span className="text-xs font-medium text-red-500 pl-1">{errors.location}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    {fieldLabel(t('personal_calendar.field_category'))}
                    {requiredMark}
                  </span>
                  <AntdSelect
                    disabled={hasRespondedParticipants}
                    size="large"
                    status={errors.scheduleTypeId ? 'error' : undefined}
                    value={values.scheduleTypeId || undefined}
                    onChange={(v) => {
                      setValues((prev) => ({ ...prev, scheduleTypeId: v }));
                      setErrors((prev) => ({ ...prev, scheduleTypeId: undefined }));
                    }}
                    placeholder={t('personal_calendar.category_placeholder')}
                    options={scheduleTypeOptions}
                    showSearch
                    optionFilterProp="label"
                    className="w-full premium-select h-10"
                    classNames={{ popup: { root: 'premium-select-dropdown' } }}
                  />
                  {errors.scheduleTypeId && <span className="text-xs font-medium text-red-500 pl-1">{errors.scheduleTypeId}</span>}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-3.5">
                <span className="inline-flex items-center gap-1">
                  {fieldLabel(t('personal_calendar.field_meeting_format'))}
                  {requiredMark}
                </span>
                <div className="relative inline-flex w-[224px] p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-full border border-slate-200/80 dark:border-slate-700/70 h-[38px]">
                  <span
                    aria-hidden
                    className="absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/2)] rounded-full bg-white dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 shadow-sm transition-transform duration-300 ease-out"
                    style={{
                      transform: `translateX(${MEETING_FORMAT_OPTIONS.findIndex((opt) => opt.value === values.meetingFormat) * 100}%)`,
                    }}
                  />
                  {MEETING_FORMAT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = values.meetingFormat === opt.value;
                    return (
                      <button
                        disabled={hasRespondedParticipants}
                        key={opt.value}
                        type="button"
                        onClick={() => !hasRespondedParticipants && setValues((prev) => ({ ...prev, meetingFormat: opt.value }))}
                        className={cn(
                          'relative z-10 flex-1 h-full rounded-full text-13 font-medium transition-colors duration-200 flex items-center justify-center gap-1.5 select-none',
                          hasRespondedParticipants ? 'cursor-not-allowed opacity-75' : 'cursor-pointer',
                          isActive
                            ? 'text-[#00529C] dark:text-blue-400 font-semibold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        )}
                      >
                        <Icon size={13} className={isActive ? 'text-[#00529C] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'} />
                        <span>{t(opt.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </FormSectionCard>
        </div>

          {/* RIGHT COLUMN: Participants, Detailed Content, Note, Attachments & Link */}
          <div className="flex flex-col gap-4 min-w-0">
            {/* Section 2: Participants */}
            <FormSectionCard number={2} title={t('personal_calendar.section_participants')} icon={<Users size={15} />}>
              {hasRespondedParticipants && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 text-12 mb-3 select-none">
                  <UserPlus size={14} className="shrink-0 text-[#00529C] dark:text-blue-400" />
                  <span>
                    {t('personal_calendar.step2_append_only_hint', {
                      defaultValue: 'Lịch đã có người xác nhận/từ chối. Bạn có thể tìm kiếm và chọn thêm thành phần tham gia mới. Người đã mời trước đó sẽ được giữ nguyên.',
                    })}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                {fieldLabel(t('personal_calendar.field_participants_department', { defaultValue: 'Lọc theo đơn vị (để dễ dàng tìm kiếm thành phần tham dự)' }))}
                <DepartmentTreeSelect
                  value={participantDepartmentId ?? undefined}
                  onChange={(id) => setParticipantDepartmentId(id || null)}
                  allowClear
                  onClear={() => setParticipantDepartmentId(null)}
                  placeholder={t('personal_calendar.field_participants_department_placeholder', { defaultValue: 'Tất cả đơn vị' })}
                />
              </div>

              <div className="flex flex-col gap-1.5 mt-3">
                {fieldLabel(t('personal_calendar.field_participants'))}
                <PagedPickerSelect<Employee>
                  key={`participants-${editing?.id || 'new'}-${participantDepartmentId || 'all'}`}
                  multiple
                  placement="bottom"
                  initialRecords={initialParticipantRecords}
                  fetchPage={fetchParticipants}
                  getValue={(e) => e.id}
                  getLabel={(e) => e.fullname}
                  isChipRemovable={(emp) => !hasRespondedParticipants || !initialParticipantIds.has(emp.id)}
                  renderOption={(e) => {
                    const phone = e.phone || e.phoneNumber;
                    const jobInfo = [e.jobTitleName, e.departmentName].filter(Boolean).join(' · ');
                    return (
                      <div className="flex items-center gap-2.5 py-1">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          {initialsOf(e.fullname)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-13 font-medium text-slate-800 dark:text-slate-100 truncate">{e.fullname}</span>
                            {e.employeeCode && (
                              <span className="shrink-0 text-[10.5px] font-normal text-[#00529C] dark:text-blue-400">{e.employeeCode}</span>
                            )}
                          </div>
                          {jobInfo && (
                            <div className="text-[10.5px] text-[#00529C]/80 dark:text-blue-400/80 truncate leading-tight">{jobInfo}</div>
                          )}
                          {(e.email || phone) && (
                            <div className="flex items-center gap-2.5 mt-0.5 text-[10.5px] text-slate-400 dark:text-slate-500">
                              {e.email && (
                                <span className="flex min-w-0 items-center gap-1 truncate">
                                  <Mail size={10} className="shrink-0" />
                                  <span className="truncate">{e.email}</span>
                                </span>
                              )}
                              {phone && (
                                <span className="flex shrink-0 items-center gap-1">
                                  <Phone size={10} className="shrink-0" />
                                  {phone}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }}
                  onChangeValues={(_ids, records) => {
                    setValues((prev) => {
                      if (hasRespondedParticipants) {
                        const newRecords = records.filter((r) => !initialParticipantIds.has(r.id));
                        return {
                          ...prev,
                          participants: [
                            ...initialParticipants,
                            ...newRecords.map((r) => ({ id: r.id, name: r.fullname, email: r.email, code: r.employeeCode })),
                          ],
                        };
                      }
                      return {
                        ...prev,
                        participants: records.map((r) => ({ id: r.id, name: r.fullname, email: r.email, code: r.employeeCode })),
                      };
                    });
                  }}
                  placeholder={t('personal_calendar.participants_placeholder')}
                />
              </div>

              <label className="mt-3 inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={values.isSendEmail}
                  onChange={(e) => setValues((prev) => ({ ...prev, isSendEmail: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#00529C] focus:ring-[#00529C]/30 cursor-pointer"
                />
                <span className="text-13 text-slate-600 dark:text-slate-300">{t('personal_calendar.field_send_email')}</span>
              </label>

              <label className="mt-2 inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={values.isConfidential}
                  onChange={(e) => setValues((prev) => ({ ...prev, isConfidential: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#00529C] focus:ring-[#00529C]/30 cursor-pointer"
                />
                <span className="text-13 text-slate-600 dark:text-slate-300">
                  {t('personal_calendar.field_confidential', { defaultValue: 'Mật — cấp dưới chỉ xem được thời gian, không xem nội dung' })}
                </span>
              </label>

              <label className="mt-2 inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={values.isApprovalRequired}
                  onChange={(e) => setValues((prev) => ({ ...prev, isApprovalRequired: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#00529C] focus:ring-[#00529C]/30 cursor-pointer"
                />
                <span className="text-13 text-slate-600 dark:text-slate-300">
                  {t('personal_calendar.field_approval_required', { defaultValue: 'Cần lãnh đạo duyệt trước khi hiển thị' })}
                </span>
              </label>
            </FormSectionCard>

            {/* Section 3: Content */}
            <FormSectionCard number={3} title={t('personal_calendar.section_content')} icon={<FileText size={15} />}>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1">
                    {fieldLabel(t('personal_calendar.field_content'))}
                    {requiredMark}
                  </span>
                  {errors.content && <span className="text-xs font-medium text-red-500">{errors.content}</span>}
                </div>
                <div className="custom-quill">
                  <ReactQuill
                    theme="snow"
                    value={values.content}
                    onChange={(html) => {
                      setValues((prev) => ({ ...prev, content: html }));
                      setErrors((prev) => ({ ...prev, content: undefined }));
                    }}
                    modules={quillModules}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                {fieldLabel(t('personal_calendar.field_note'))}
                <textarea
                  value={values.note}
                  onChange={(e) => setValues((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder={t('personal_calendar.note_placeholder')}
                  rows={2}
                  className={textareaClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div className="flex flex-col gap-1.5">
                  {fieldLabel(t('personal_calendar.field_attachments'))}
                  <FileAttachmentInput
                    files={values.attachments}
                    onChange={(files) => setValues((prev) => ({ ...prev, attachments: files }))}
                    maxFiles={5}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5">
                      {fieldLabel(t('personal_calendar.field_link'))}
                      {values.links.filter((l) => l.trim()).length > 0 && (
                        <span className="text-11 font-semibold text-[#00529C] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/50">
                          {values.links.filter((l) => l.trim()).length}/3
                        </span>
                      )}
                    </span>
                    {values.links.length < 3 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setValues((prev) => (prev.links.length < 3 ? { ...prev, links: [...prev.links, ''] } : prev))
                        }
                        className="inline-flex items-center gap-1 text-12 font-medium text-[#00529C] dark:text-blue-400 cursor-pointer"
                      >
                        <Link2 size={14} />
                        <span>{t('personal_calendar.link_add_btn')}</span>
                      </button>
                    ) : (
                      <span className="text-11 font-medium text-slate-400 dark:text-slate-500">{t('personal_calendar.link_max_hint')}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {values.links.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          value={link}
                          onChange={(e) => {
                            const val = e.target.value;
                            setValues((prev) => {
                              const next = [...prev.links];
                              next[idx] = val;
                              return { ...prev, links: next };
                            });
                          }}
                          placeholder={t('personal_calendar.link_placeholder')}
                          className={inputClass}
                        />
                        {values.links.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setValues((prev) => ({
                                ...prev,
                                links: prev.links.filter((_, i) => i !== idx),
                              }));
                            }}
                            className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/50 cursor-pointer transition-colors"
                            title={t('personal_calendar.link_remove')}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FormSectionCard>
          </div>
        </div>
      </FormModalBody>

      <FormModalFooter
        onCancel={isDraftEligible ? handleSaveDraft : onCancel}
        cancelText={isDraftEligible ? t('personal_calendar.modal_save_draft') : t('personal_calendar.modal_cancel')}
        cancelIcon={isDraftEligible ? <Save size={15} /> : undefined}
        submitText={editing ? t('personal_calendar.modal_edit_ok') : t('personal_calendar.modal_add_ok')}
        submitIcon={editing ? <Save size={15} /> : <CalendarPlus size={15} />}
        loading={loading}
        htmlType="button"
        onSubmit={handleSubmit}
      />
    </FormModal>

    <ConfirmModal
      open={showDraftPrompt}
      onCancel={() => {
        setShowDraftPrompt(false);
        onCancel();
      }}
      onClose={() => setShowDraftPrompt(false)}
      onConfirm={() => {
        setShowDraftPrompt(false);
        handleSaveDraft();
      }}
      title={t('personal_calendar.draft_prompt_title')}
      description={t('personal_calendar.draft_prompt_desc')}
      confirmText={t('personal_calendar.draft_prompt_save')}
      confirmIcon={<Save size={15} />}
      cancelText={t('personal_calendar.draft_prompt_discard')}
      variant="draft"
      zIndex={1400}
    />

    <Modal
      open={!!pendingSubmit}
      onCancel={() => setPendingSubmit(null)}
      footer={null}
      title={null}
      closeIcon={null}
      width={540}
      centered
      zIndex={1400}
      styles={{ container: { padding: 0 }, body: { padding: 0 } }}
    >
      <div className="p-6 relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        
        <button
          type="button"
          onClick={() => setPendingSubmit(null)}
          className="absolute top-5 right-5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200/60 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#00529C] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
            <CalendarRange size={22} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-16 font-bold text-slate-800 dark:text-slate-100 leading-snug tracking-tight">
              {t('personal_calendar.update_scope_title')}
            </h3>
            <p className="mt-1 text-13 text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('personal_calendar.update_scope_desc')}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {/* Option 1: Single Day — the default/recommended choice (narrowest blast radius), so it
              gets the prominent styling; "all days" below is the plain option since it's the one
              that needs a deliberate choice. */}
          <button
            type="button"
            onClick={() => confirmUpdateScope(true)}
            className="group relative flex items-center justify-between p-3.5 rounded-2xl border border-blue-200/90 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/30 dark:from-blue-950/30 dark:via-slate-900 dark:to-indigo-950/20 hover:border-[#00529C] dark:hover:border-blue-400 hover:shadow-md transition-all duration-200 text-left cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00529C] dark:bg-blue-500 text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
                <CalendarDays size={19} />
              </div>
              <div className="min-w-0">
                <div className="text-13.5 font-bold text-[#00529C] dark:text-blue-400">
                  {t('personal_calendar.update_scope_single')}
                </div>
                <div className="text-12 text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('personal_calendar.update_scope_single_desc')}
                </div>
              </div>
            </div>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00529C] dark:bg-blue-500 text-white shadow-xs group-hover:translate-x-0.5 transition-transform duration-200">
              <ArrowRight size={14} />
            </div>
          </button>

          {/* Option 2: All Days */}
          <button
            type="button"
            onClick={() => confirmUpdateScope(false)}
            className="group relative flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-[#00529C]/60 dark:hover:border-blue-400 hover:shadow-md transition-all duration-200 text-left cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs group-hover:bg-[#00529C]/10 group-hover:text-[#00529C] dark:group-hover:text-blue-400 group-hover:border-[#00529C]/20 transition-all duration-200">
                <CalendarRange size={19} />
              </div>
              <div className="min-w-0">
                <div className="text-13.5 font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#00529C] dark:group-hover:text-blue-400 transition-colors">
                  {t('personal_calendar.update_scope_all')}
                </div>
                <div className="text-12 text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('personal_calendar.update_scope_all_desc')}
                </div>
              </div>
            </div>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-500 group-hover:bg-[#00529C] group-hover:text-white dark:group-hover:bg-blue-500 transition-all duration-200">
              <ArrowRight size={14} />
            </div>
          </button>
        </div>

        <div className="mt-5 flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setPendingSubmit(null)}
            className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-13 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 transition-colors cursor-pointer"
          >
            {t('personal_calendar.modal_cancel')}
          </button>
        </div>
      </div>
    </Modal>
    </>
  );
};

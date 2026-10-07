import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { Select as AntdSelect, DatePicker, TimePicker } from 'antd';
import { Avatar } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
  Mail,
  Phone,
  Building2,
  Video,
  Link2,
  Trash2,
  CalendarDays,
  CalendarClock,
  FileText,
  Users,
  MapPin,
  Save,
  CalendarPlus,
  UserCheck,
  X,
  Sparkles,
  Loader2,
  Check,
  AlertTriangle,
  Lock,
  Clock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  FormModal,
  FormModalHeader,
  FormModalBody,
  FormModalFooter,
  FormSectionCard,
  formFieldLabel as fieldLabel,
} from '../../../../components/ui/FormModal';
import { ConfirmModal } from '../../../../components/ui/ConfirmModal';
import { LeaderBusyCalendarModal } from './LeaderBusyCalendarModal';
import { LeaderScheduleComparisonView } from './LeaderScheduleComparisonView';
import { checkDetailedAvailabilityConflict } from '../utils/scheduleComparisonUtils';
import { toast } from '../../../../store/toastStore';
import { PagedPickerSelect } from '../../../../components/ui/PagedPickerSelect';
import { DepartmentTreeSelect } from '../../../../components/shared/DepartmentTreeSelect';
import { withPriorityColor } from '../../../../components/ui/PriorityOption';
import { FileAttachmentInput } from '../../../../components/ui/FileAttachmentInput';
import { userAPI, type IExecutiveUser } from '../../../../services/api/userAPI';
import type { IUserAvailability } from '../../../../services/api/scheduleOccurrenceAPI';
import { useAuthStore } from '../../../../store/authStore';
import { useActingLeaderStore } from '../../../../store/actingLeaderStore';
import { QUILL_FONT_OPTIONS } from '../../../../utils/quillConfig';
import { useScheduleTypesQuery } from '../../../categories/meeting-type/hooks/useScheduleTypeQueries';
import type { Employee } from '../../../system/types';
import { cn, resolveAttachmentUrl } from '../../../../utils/helpers';
import { computeEndTime, isRangeAvailable, rankSuggestedSlots, type TimeSlot } from '../utils/timeSlots';
import { fromApiDateTime } from '../../../../utils/dateTime';
import { useDayAvailabilityQuery } from '../../LichCaNhan/hooks/useDayAvailabilityQuery';
import { buildDayAvailabilitySlots } from '../../LichCaNhan/utils/availabilitySlots';
import { MEETING_WINDOW_START, MEETING_WINDOW_END } from '../../../../constants/workingHours';
import { TimeSlotHintBar } from '../../components/TimeSlotHintBar';
import { useMinuteTick } from '../../../../hooks';
import {
  DURATION_OPTIONS,
  getPriorityOptions,
  type MeetingFormat,
  type RequestStatus,
  type SchedulePriority,
} from '../types';
import type { LeadershipRequestInput } from '../hooks/useLeadershipScheduleQueries';
import { STATUS_COLOR_FAMILY } from '../statusTheme';
import { STATUS_COLOR_PALETTE } from '../../../../constants/statusColorPalette';

const requiredMark = <span className="text-red-500">*</span>;

const MEETING_FORMAT_OPTIONS = [
  { value: 'offline' as const, labelKey: 'leadership_schedule.format_offline', icon: Building2 },
  { value: 'online' as const, labelKey: 'leadership_schedule.format_online', icon: Video },
];

const initialsOf = (name: string) => name.split(' ').filter(Boolean).slice(-2).map((n) => n[0]).join('').toUpperCase();

const toMinutesOfDay = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const AVAILABILITY_WINDOW_START_MIN = toMinutesOfDay(MEETING_WINDOW_START);
const AVAILABILITY_WINDOW_END_MIN = toMinutesOfDay(MEETING_WINDOW_END);
const AVAILABILITY_WINDOW_SPAN = Math.max(1, AVAILABILITY_WINDOW_END_MIN - AVAILABILITY_WINDOW_START_MIN);

interface AvailabilitySegment {
  left: number;
  width: number;
}

interface AvailabilitySummary {
  busyLabel: string;
  busySlots: { start: string; end: string }[];
  segments: AvailabilitySegment[];
}

const buildAvailabilitySummary = (user: IUserAvailability | undefined, date: string): AvailabilitySummary => {
  const day = user?.days.find((d) => d.date === date);
  const busyTimes = day?.busyTimes ?? [];
  const segments = busyTimes
    .map((r) => {
      const start = fromApiDateTime(r.startDate);
      const end = fromApiDateTime(r.endDate);
      const startMin = Math.min(Math.max(start.hour() * 60 + start.minute(), AVAILABILITY_WINDOW_START_MIN), AVAILABILITY_WINDOW_END_MIN);
      const endMin = Math.min(Math.max(end.hour() * 60 + end.minute(), AVAILABILITY_WINDOW_START_MIN), AVAILABILITY_WINDOW_END_MIN);
      if (endMin <= startMin) return null;
      return {
        left: ((startMin - AVAILABILITY_WINDOW_START_MIN) / AVAILABILITY_WINDOW_SPAN) * 100,
        width: ((endMin - startMin) / AVAILABILITY_WINDOW_SPAN) * 100,
      };
    })
    .filter((s): s is AvailabilitySegment => !!s);

  const busySlots = busyTimes.map((r) => ({
    start: fromApiDateTime(r.startDate).format('HH:mm'),
    end: fromApiDateTime(r.endDate).format('HH:mm'),
  }));

  const busyLabel = busySlots.map((s) => `${s.start}–${s.end}`).join(', ');

  return { busyLabel, busySlots, segments };
};

interface ExecutiveSelectorProps {
  value?: string;
  onChange: (id: string, executive?: IExecutiveUser) => void;
  initialRecord?: IExecutiveUser;
  hasError?: boolean;
  /** Disables this user in the picker — the requester can't register a meeting with themselves. */
  excludeId?: string;
  disabled?: boolean;
}

const fetchExecutives = async ({ search, page, pageSize }: { search: string; page: number; pageSize: number }) => {
  const res = await userAPI.getExecutiveManagement({ searchKeyword: search, PageNumber: page, PageSize: pageSize });
  return { items: res.items || [], total: res.totalCount || 0 };
};

const ExecutiveSelector: React.FC<ExecutiveSelectorProps> = ({ value, onChange, initialRecord, hasError, excludeId, disabled }) => {
  const { t } = useTranslation();

  return (
    <PagedPickerSelect<IExecutiveUser>
      value={value}
      onChange={onChange}
      initialRecord={initialRecord}
      fetchPage={fetchExecutives}
      getValue={(e) => e.id}
      getLabel={(e) => e.fullname}
      isOptionDisabled={(e) => e.id === excludeId}
      placeholder={t('leadership_schedule.executive_placeholder')}
      pageSize={5}
      pageSizeOptions={[5, 10]}
      optionBorderless
      disabled={disabled}
      className={cn('!min-h-[56px]', hasError && '!border-red-400 dark:!border-red-500')}
      renderOption={(e) => (
        <div className="flex items-center gap-2.5 py-0.5">
          <Avatar
            src={resolveAttachmentUrl(e.avatarUrl)}
            slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
            className="!h-8 !w-8 shrink-0 border border-slate-200 dark:border-slate-700 !text-[11px] !font-semibold !bg-slate-100 dark:!bg-slate-800 !text-slate-600 dark:!text-slate-300"
          >
            {initialsOf(e.fullname)}
          </Avatar>
          <div className="min-w-0">
            <div className="text-13 font-medium text-slate-800 dark:text-slate-100 truncate">{e.fullname}</div>
            {(e.positionName || e.jobTitleName || e.departmentName) && (
              <div className="text-11 text-slate-400 dark:text-slate-500 truncate">{e.positionName || e.jobTitleName || e.departmentName}</div>
            )}
          </div>
        </div>
      )}
      renderSelected={(e) => (
        <div className="flex items-center gap-2.5">
          <Avatar
            src={resolveAttachmentUrl(e.avatarUrl)}
            slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
            className="!h-7 !w-7 shrink-0 border border-slate-200 dark:border-slate-700 !text-[10.5px] !font-semibold !bg-slate-100 dark:!bg-slate-800 !text-slate-600 dark:!text-slate-300"
          >
            {initialsOf(e.fullname)}
          </Avatar>
          <div className="min-w-0 leading-tight">
            <div className="text-13 font-medium text-slate-800 dark:text-slate-100 truncate">{e.fullname}</div>
            {(e.positionName || e.jobTitleName) && (
              <div className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate">{e.positionName || e.jobTitleName}</div>
            )}
          </div>
        </div>
      )}
    />
  );
};

interface LeaderAvailabilityEntry {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string | null;
  summary: AvailabilitySummary;
}

interface LeaderAvailabilityPanelProps {
  entries: LeaderAvailabilityEntry[];
  loading?: boolean;
  requesterId?: string;
  requesterName?: string;
  requesterAvatarUrl?: string | null;
  executiveId?: string;
  executiveName?: string;
  executiveAvatarUrl?: string | null;
  date?: string;
  onOpenCalendarTab?: () => void;
}

const LeaderAvailabilityPanel: React.FC<LeaderAvailabilityPanelProps> = ({
  entries,
  loading,
  requesterId,
  requesterName,
  requesterAvatarUrl,
  executiveId,
  executiveName,
  executiveAvatarUrl,
  date,
  onOpenCalendarTab,
}) => {
  const { t } = useTranslation();
  const [busyCalendarOpen, setBusyCalendarOpen] = useState(false);

  return (
    <>
      <div className="mt-1 flex flex-col gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-normal text-slate-500 dark:text-slate-400">
            {t('leadership_schedule.availability_title')}
          </span>
          <button
            type="button"
            onClick={() => {
              if (onOpenCalendarTab) {
                onOpenCalendarTab();
              } else {
                setBusyCalendarOpen(true);
              }
            }}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00529C] to-[#0072CE] dark:from-blue-600 dark:to-blue-500 px-4 py-2 text-[12px] font-medium text-white shadow-sm shadow-[#00529C]/25 dark:shadow-blue-500/25 transition-all duration-150 hover:shadow-md hover:shadow-[#00529C]/35 hover:-translate-y-0.5 active:scale-[0.98] select-none cursor-pointer focus:outline-none"
          >
            <CalendarClock size={14} className="shrink-0" />
            {t('leadership_schedule.busy_calendar_trigger')}
          </button>
        </div>

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-4 text-13 text-slate-400 dark:text-slate-500">
              <Loader2 size={16} className="animate-spin text-[#00529C] dark:text-blue-400" />
              {t('leadership_schedule.availability_loading')}
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={resolveAttachmentUrl(entry.avatarUrl)}
                    slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                    className="!h-8 !w-8 shrink-0 border border-slate-200 dark:border-slate-700 !text-[11px] !font-semibold !bg-slate-100 dark:!bg-slate-800 !text-slate-600 dark:!text-slate-300"
                  >
                    {initialsOf(entry.name || '?')}
                  </Avatar>
                  <div className="min-w-0 flex flex-col leading-tight">
                    <div className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">
                      {entry.name || t('leadership_schedule.availability_unknown_user')}
                    </div>
                    {entry.role && <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{entry.role}</div>}
                  </div>
                </div>

                {entry.summary.busySlots.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[65%]">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500/90 dark:text-rose-400/90 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                      {t('leadership_schedule.availability_busy_label')}:
                    </span>
                    {entry.summary.busySlots.slice(0, 3).map((slot, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-md bg-rose-50/60 dark:bg-rose-950/25 border border-rose-200/50 dark:border-rose-800/35 px-2 py-0.5 text-[11px] font-medium tabular-nums text-rose-600/90 dark:text-rose-300/90 shadow-2xs"
                      >
                        <Clock size={10} className="shrink-0 text-rose-400/80 dark:text-rose-400/80" />
                        <span>{slot.start}</span>
                        <span className="text-rose-400/70 font-normal mx-0.5">-</span>
                        <span>{slot.end}</span>
                      </span>
                    ))}
                    {entry.summary.busySlots.length > 3 && (
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        +{entry.summary.busySlots.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {t('leadership_schedule.availability_free_label')}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    <LeaderBusyCalendarModal
      open={busyCalendarOpen}
      onClose={() => setBusyCalendarOpen(false)}
      requesterId={requesterId}
      requesterName={requesterName}
      requesterAvatarUrl={requesterAvatarUrl}
      executiveId={executiveId}
      executiveName={executiveName}
      executiveAvatarUrl={executiveAvatarUrl}
      initialDate={date}
    />
    </>
  );
};

const TIME_SLOT_SUGGESTION_LIMIT = 4;

interface DescriptionEditorProps {
  value: string;
  onChange: (html: string, source: string) => void;
  modules: Record<string, unknown>;
}

const DescriptionEditor = React.memo<DescriptionEditorProps>(({ value, onChange, modules }) => (
  <ReactQuill theme="snow" value={value} onChange={(html, _delta, source) => onChange(html, source)} modules={modules} />
));
DescriptionEditor.displayName = 'DescriptionEditor';

interface TimeSlotPickerProps {
  executiveId?: string;
  slots: TimeSlot[];
  loading?: boolean;
  date: string;
  onDateChange: (date: string) => void;
  durationMinutes: number;
  selectedStart?: string;
  onSelectStart: (start: string) => void;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  executiveId,
  slots,
  loading,
  date,
  durationMinutes,
  selectedStart,
  onSelectStart,
}) => {
  const { t } = useTranslation();

  const nowTick = useMinuteTick();
  const isToday = dayjs(date).isSame(dayjs(), 'day');

  const bookableSlots = useMemo(() => {
    if (!isToday) return slots;
    const nowMin = dayjs().hour() * 60 + dayjs().minute();
    return slots.map((s) => {
      const [h, m] = s.start.split(':').map(Number);
      return h * 60 + m < nowMin ? { ...s, available: false } : s;
    });
  }, [slots, isToday, nowTick]);

  const suggestedStarts = useMemo(
    () => (bookableSlots.length ? rankSuggestedSlots(bookableSlots, durationMinutes, TIME_SLOT_SUGGESTION_LIMIT) : []),
    [bookableSlots, durationMinutes]
  );

  const preferredStart = suggestedStarts[0] ?? null;

  const displayStarts = useMemo(() => {
    if (
      !selectedStart ||
      suggestedStarts.includes(selectedStart) ||
      !isRangeAvailable(bookableSlots, selectedStart, durationMinutes)
    ) {
      return suggestedStarts;
    }
    return [...suggestedStarts, selectedStart].sort();
  }, [suggestedStarts, selectedStart, bookableSlots, durationMinutes]);

  const hasAnyAvailable = suggestedStarts.length > 0;

  if (!executiveId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-10 text-center">
        <CalendarClock size={22} className="text-slate-300 dark:text-slate-600" />
        <span className="text-13 text-slate-400 dark:text-slate-500">{t('leadership_schedule.slot_select_executive_first')}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-6 text-12.5 text-slate-400 dark:text-slate-500">
          <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
          <span>{t('leadership_schedule.slot_loading')}</span>
        </div>
      ) : !hasAnyAvailable ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-4 text-center text-12.5 text-slate-400 dark:text-slate-500">
          {t('leadership_schedule.slot_no_available')}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {displayStarts.map((start) => {
            const isSelected = selectedStart === start;
            const isAvailable = isRangeAvailable(bookableSlots, start, durationMinutes);
            const isPreferred = preferredStart === start && isAvailable;
            const subtext = !isAvailable
              ? t('leadership_schedule.slot_unavailable')
              : isPreferred && !isSelected
                ? t('leadership_schedule.slot_preferred')
                : null;

            return (
              <button
                key={start}
                type="button"
                disabled={!isAvailable}
                onClick={() => {
                  if (!isAvailable) return;
                  onSelectStart(isSelected ? '' : start);
                }}
                className={cn(
                  'relative flex flex-col items-center justify-center h-[42px] py-1 px-2.5 rounded-2xl border transition-all duration-200 select-none text-center cursor-pointer',
                  !isAvailable
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 cursor-not-allowed opacity-60'
                    : isSelected
                      ? 'border-[#00529C]/50 dark:border-blue-400/70 bg-blue-50/70 dark:bg-blue-950/40 text-[#00529C] dark:text-blue-400 shadow-xs font-bold hover:bg-blue-100 hover:border-[#00529C]/70'
                      : isPreferred
                        ? 'border-[#00529C]/30 dark:border-blue-800/80 bg-blue-50/40 dark:bg-blue-950/20 hover:border-[#00529C] hover:bg-blue-50/80 hover:text-[#00529C] hover:shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#00529C]/40 hover:bg-blue-50/50 hover:text-[#00529C] hover:shadow-2xs'
                )}
              >
                <div className="flex items-center justify-center gap-1.5 leading-none">
                  {isSelected && (
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500 dark:bg-blue-500 text-white">
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                  <span
                    className={cn(
                      'text-[13.5px] tracking-tight tabular-nums transition-colors',
                      !isAvailable && 'text-slate-400 dark:text-slate-500 font-normal',
                      isAvailable && isSelected && 'text-[#00529C] dark:text-blue-400 font-bold',
                      isAvailable && !isSelected && isPreferred && 'text-[#00529C] dark:text-blue-400 font-semibold',
                      isAvailable && !isSelected && !isPreferred && 'text-slate-800 dark:text-slate-100 font-medium'
                    )}
                  >
                    {start}
                  </span>
                </div>

                {subtext && (
                  <span
                    className={cn(
                      'text-[11px] font-normal leading-tight mt-0.5 transition-colors',
                      !isAvailable && 'text-slate-400 dark:text-slate-500 text-[10.5px]',
                      isAvailable && isPreferred && 'text-[#00529C]/80 dark:text-blue-400/80 font-normal'
                    )}
                  >
                    {subtext}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!loading && <TimeSlotHintBar />}
    </div>
  );
};
  
const inputClass =
  'w-full h-[40px] px-3.5 rounded-xl border bg-white dark:bg-slate-900 dark:text-slate-100 text-sm transition-all duration-200 focus:outline-none focus:ring-4 border-slate-200 dark:border-slate-700 hover:border-[#00529C] focus:border-[#00529C] focus:ring-[#00529C]/10 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:text-13 placeholder:font-normal';

const textareaClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 resize-none transition-all duration-200 hover:border-[#00529C] focus:border-[#00529C] focus:outline-none focus:ring-4 focus:ring-[#00529C]/10 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:text-13 placeholder:font-normal';

const buildSchema = (t: (key: string) => string) =>
  z.object({
    executiveId: z.string().min(1, t('leadership_schedule.validation_executive_required')),
    title: z.string().trim().min(1, t('leadership_schedule.validation_title_required')),
    description: z
      .string()
      .refine((val) => !!val.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim(), {
        message: t('leadership_schedule.validation_description_required'),
      }),
    durationMinutes: z.number(),
    location: z.string().trim().min(1, t('leadership_schedule.validation_location_required')),
    scheduleTypeId: z.string().min(1, t('leadership_schedule.validation_schedule_type_required')),
    meetingFormat: z.enum(['offline', 'online']).optional(),
    priority: z.enum(['urgent', 'normal']).optional(),
    isMultiDay: z.boolean(),
    date: z.string().min(1),
    endDate: z.string().min(1),
    startTime: z.string().min(1, t('leadership_schedule.validation_time_required')),
    participants: z.array(
      z.object({ id: z.string(), name: z.string(), email: z.string().nullable().optional(), code: z.string().nullable().optional() })
    ),
    note: z.string().optional(),
    isSendEmail: z.boolean().optional(),
    isConfidential: z.boolean().optional(),
    isApprovalRequired: z.boolean().optional(),
    attachments: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          size: z.number(),
          file: z.instanceof(File).optional(),
          url: z.string().optional(),
        })
      )
      .optional(),
    links: z.array(z.string()).optional(),
  });

export type RequestFormValues = z.infer<ReturnType<typeof buildSchema>>;

const buildDefaultValues = (initial?: Partial<RequestFormValues>): RequestFormValues => ({
  executiveId: initial?.executiveId ?? '',
  title: initial?.title ?? '',
  description: initial?.description ?? '',
  durationMinutes: initial?.durationMinutes ?? 30,
  location: initial?.location ?? '',
  scheduleTypeId: initial?.scheduleTypeId ?? '',
  meetingFormat: initial?.meetingFormat ?? 'offline',
  priority: initial?.priority ?? 'normal',
  isMultiDay: initial?.isMultiDay ?? (!!initial?.date && !!initial?.endDate && initial.date !== initial.endDate),
  date: initial?.date ?? dayjs().format('YYYY-MM-DD'),
  endDate: initial?.endDate ?? initial?.date ?? dayjs().format('YYYY-MM-DD'),
  startTime: initial?.startTime ?? '',
  participants: initial?.participants ?? [],
  note: initial?.note ?? '',
  isSendEmail: initial?.isSendEmail ?? false,
  isConfidential: initial?.isConfidential ?? false,
  isApprovalRequired: initial?.isApprovalRequired ?? false,
  attachments: initial?.attachments ?? [],
  links: initial?.links && initial.links.length > 0 ? initial.links : [''],
});

export interface LeadershipScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: LeadershipRequestInput, options?: { isDraft?: boolean }) => void;
  loading?: boolean;
  initialValues?: Partial<RequestFormValues>;
  initialExecutive?: IExecutiveUser;
  isResubmit?: boolean;
  isDraftEdit?: boolean;
  isPendingEdit?: boolean;
  excludeScheduleOccurrenceId?: string;
  excludeScheduleId?: string;
}

export const LeadershipScheduleModal: React.FC<LeadershipScheduleModalProps> = ({
  open,
  onClose,
  onSubmit,
  loading,
  initialValues,
  initialExecutive,
  isResubmit,
  isDraftEdit,
  isPendingEdit,
  excludeScheduleOccurrenceId,
  excludeScheduleId,
}) => {
  const { t } = useTranslation();
  const schema = useMemo(() => buildSchema(t), [t]);
  const { data: scheduleTypesData } = useScheduleTypesQuery({ PageSize: 20 });
  const scheduleTypeOptions = useMemo(
    () => (scheduleTypesData?.items || []).map((st) => ({ value: st.id, label: st.name })),
    [scheduleTypesData]
  );
  const priorityOptions = useMemo(() => getPriorityOptions(t), [t]);

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

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(initialValues),
  });

  const [selectedExecutive, setSelectedExecutive] = useState<IExecutiveUser | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'leader-calendar'>('form');

  useEffect(() => {
    if (open) {
      reset(buildDefaultValues(initialValues));
      setSelectedExecutive(initialExecutive ?? null);
      setActiveTab('form');
    }
  }, [open, initialValues, initialExecutive]);

  const values = watch();
  const executive = selectedExecutive;
  const endTime = values.startTime ? computeEndTime(values.startTime, values.durationMinutes) : '';

  const handleDescriptionChange = useCallback(
    (html: string, source: string) => setValue('description', html, { shouldValidate: source === 'user' }),
    [setValue]
  );

  useEffect(() => {
    if (values.date && values.endDate && values.endDate < values.date) {
      setValue('endDate', values.date);
    }
  }, [values.date]);

  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentUserName = useAuthStore((s) => s.user?.name);
  const currentUserAvatarUrl = useAuthStore((s) => s.user?.avatarUrl);
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  const actingLeaderName = useActingLeaderStore((s) => s.actingLeader?.fullname);
  const actingLeaderAvatarUrl = useActingLeaderStore((s) => s.actingLeader?.avatarUrl);
  const requesterId = actingLeaderId || currentUserId;
  const requesterName = actingLeaderName || currentUserName;
  const requesterAvatarUrl = actingLeaderAvatarUrl || currentUserAvatarUrl;

  const dayAvailabilityUserIds = useMemo(() => {
    return Array.from(new Set([values.executiveId, requesterId].filter((id): id is string => !!id)));
  }, [values.executiveId, requesterId]);
  const conflictCheckDates = useMemo(() => {
    if (!values.date) return [];
    if (!values.isMultiDay || !values.endDate || values.endDate <= values.date) return [values.date];
    const dates: string[] = [];
    let cursor = dayjs(values.date);
    let guard = 0;
    while (cursor.format('YYYY-MM-DD') <= values.endDate && guard < 366) {
      dates.push(cursor.format('YYYY-MM-DD'));
      cursor = cursor.add(1, 'day');
      guard += 1;
    }
    return dates;
  }, [values.date, values.endDate, values.isMultiDay]);
  const dayAvailabilityEndDate = values.isMultiDay && values.endDate ? values.endDate : values.date;
  const dayAvailabilityExclude = useMemo(
    () => ({ scheduleOccurrenceId: excludeScheduleOccurrenceId, scheduleId: excludeScheduleId }),
    [excludeScheduleOccurrenceId, excludeScheduleId]
  );
  const { data: dayAvailability, isFetching: daySlotsLoading } = useDayAvailabilityQuery(
    dayAvailabilityUserIds,
    values.date,
    open,
    dayAvailabilityExclude,
    dayAvailabilityEndDate
  );
  const daySlots = useMemo(
    () => (dayAvailability && values.date ? buildDayAvailabilitySlots(dayAvailability, values.date) : []),
    [dayAvailability, values.date]
  );

  const availabilityEntries = useMemo((): LeaderAvailabilityEntry[] => {
    if (!dayAvailability || !values.date) return [];
    const byId = new Map(dayAvailability.map((u) => [u.userId, u]));
    const entries: LeaderAvailabilityEntry[] = [];
    if (requesterId) {
      entries.push({
        id: requesterId,
        name: requesterName || byId.get(requesterId)?.fullName || '',
        avatarUrl: requesterAvatarUrl,
        summary: buildAvailabilitySummary(byId.get(requesterId), values.date),
      });
    }
    if (values.executiveId && values.executiveId !== requesterId) {
      entries.push({
        id: values.executiveId,
        name: selectedExecutive?.fullname || byId.get(values.executiveId)?.fullName || '',
        role: selectedExecutive?.positionName || selectedExecutive?.jobTitleName || undefined,
        avatarUrl: selectedExecutive?.avatarUrl,
        summary: buildAvailabilitySummary(byId.get(values.executiveId), values.date),
      });
    }
    return entries;
  }, [dayAvailability, values.date, values.executiveId, requesterId, requesterName, requesterAvatarUrl, selectedExecutive]);

  const detailedConflict = useMemo(() => {
    if (!values.startTime || !conflictCheckDates.length || !dayAvailability?.length) return null;
    const candidateEnd = computeEndTime(values.startTime, values.durationMinutes);
    return checkDetailedAvailabilityConflict(
      dayAvailability,
      conflictCheckDates,
      values.startTime,
      candidateEnd,
      requesterId,
      values.executiveId
    );
  }, [dayAvailability, conflictCheckDates, values.startTime, values.durationMinutes, requesterId, values.executiveId]);

  const timeConflict = detailedConflict?.hasConflict ? detailedConflict : null;

  const outsideWorkingWindow = useMemo(() => {
    if (!values.startTime) return false;
    const candidateEnd = computeEndTime(values.startTime, values.durationMinutes);
    return values.startTime < MEETING_WINDOW_START || candidateEnd > MEETING_WINDOW_END;
  }, [values.startTime, values.durationMinutes]);

  const [participantDepartmentId, setParticipantDepartmentId] = useState<string | null>(null);

  const fetchParticipants = async ({ search, page, pageSize }: { search: string; page: number; pageSize: number }) => {
    const res = await userAPI.getUsers({
      searchKeyword: search,
      PageNumber: page,
      PageSize: pageSize,
      departmentId: participantDepartmentId || undefined,
    });
    return { items: (res.items || []) as Employee[], total: res.totalCount || 0 };
  };

  const initialParticipantRecords = useMemo<Employee[]>(
    () => (initialValues?.participants ?? []).map((p) => ({ id: p.id, username: p.id, fullname: p.name, email: p.email ?? null, employeeCode: p.code ?? null })),
    [open, initialValues]
  );

  const submit = handleSubmit((data) => {
    onSubmit(
      {
        executiveId: data.executiveId,
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        durationMinutes: data.durationMinutes,
        date: data.date,
        endDate: data.endDate,
        startTime: data.startTime,
        endTime: computeEndTime(data.startTime, data.durationMinutes),
        location: data.location.trim(),
        scheduleTypeId: data.scheduleTypeId || undefined,
        meetingFormat: data.meetingFormat as MeetingFormat,
        priority: data.priority as SchedulePriority,
        participants: data.participants,
        note: data.note?.trim() || undefined,
        attachments: data.attachments ?? [],
        link: (data.links ?? []).map((l) => l.trim()).filter(Boolean).join('\n') || undefined,
        isConfidential: data.isConfidential ?? false,
        isApprovalRequired: data.isApprovalRequired ?? false,
      },
      { isDraft: false }
    );
  });

  const buildDraftInput = (): LeadershipRequestInput => {
    const startTime = values.startTime || '00:00';
    return {
      executiveId: values.executiveId,
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      durationMinutes: values.durationMinutes,
      date: values.date || dayjs().format('YYYY-MM-DD'),
      endDate: values.endDate || values.date || dayjs().format('YYYY-MM-DD'),
      startTime,
      endTime: computeEndTime(startTime, values.durationMinutes),
      location: values.location.trim(),
      scheduleTypeId: values.scheduleTypeId || undefined,
      meetingFormat: values.meetingFormat as MeetingFormat,
      priority: values.priority as SchedulePriority,
      participants: values.participants,
      note: values.note?.trim() || undefined,
      attachments: values.attachments ?? [],
      link: (values.links ?? []).map((l) => l.trim()).filter(Boolean).join('\n') || undefined,
      isConfidential: values.isConfidential ?? false,
      isApprovalRequired: values.isApprovalRequired ?? false,
    };
  };

  const handleSaveDraft = () => {
    onSubmit(buildDraftInput(), { isDraft: true });
  };

  const offerSaveDraft = isDraftEdit || !isResubmit;
  const lockExecutive = !!isResubmit && !isDraftEdit;

  const drawerTitleKey = isDraftEdit
    ? 'leadership_schedule.drawer_draft_edit_title'
    : isPendingEdit
      ? 'leadership_schedule.drawer_pending_edit_title'
      : isResubmit
        ? 'leadership_schedule.drawer_resubmit_title'
        : 'leadership_schedule.drawer_create_title';

  // Tint the footer with the status the request is in (new requests take the "submitted" color they'll get on send).
  const footerStatus: RequestStatus = isDraftEdit ? 'draft' : isPendingEdit ? 'pending' : isResubmit ? 'rejected' : 'submitted';
  const footerGradient = STATUS_COLOR_PALETTE[STATUS_COLOR_FAMILY[footerStatus]].footerGradient;

  const isFormDirty = () => offerSaveDraft && isDirty;

  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  const handleRequestClose = () => {
    if (isFormDirty()) {
      setShowDraftPrompt(true);
      return;
    }
    onClose();
  };

  const links = values.links ?? [''];
  const attachments = values.attachments ?? [];

  return (
    <>
    <FormModal open={open} onCancel={onClose} width="80vw" centered>
      <FormModalHeader
        title={values.title?.trim() || t(drawerTitleKey)}
        subtitle={
          values.title?.trim()
            ? t(drawerTitleKey)
            : t('leadership_schedule.drawer_subtitle', { defaultValue: 'Đăng ký lịch họp hoặc làm việc với Lãnh đạo' })
        }
        icon={<CalendarDays size={22} className="text-white" />}
        iconClassName="bg-gradient-to-br from-blue-400 to-blue-500 shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5)]"
        onClose={handleRequestClose}
      />

      {/* TAB NAVIGATION: Luxury sleek segmented controls */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-2.5 bg-gradient-to-b from-white via-white to-slate-50/50 dark:from-[#0b1329] dark:via-[#0a1126] dark:to-[#080e1e] shrink-0">
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
          {(
            [
              { key: 'form', icon: CalendarPlus, label: t('leadership_schedule.tab_form') },
              { key: 'leader-calendar', icon: CalendarDays, label: t('leadership_schedule.tab_leader_calendar') },
            ] as const
          ).map(({ key, icon: Icon, label }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={cn(
                  'relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-200 cursor-pointer select-none',
                  isActive
                    ? 'text-[#00529C] dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="leadership-schedule-tab-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 rounded-full bg-white dark:bg-slate-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5"
                  />
                )}
                <Icon size={15} className="relative" />
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'form' ? (
        <>
          <FormModalBody>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4 min-w-0 h-full">
            {/* Section 1: Executive Selection */}
            <FormSectionCard number={1} title={t('leadership_schedule.step_executive')} icon={<UserCheck size={15} />}>
              <Controller
                control={control}
                name="executiveId"
                render={({ field }) => (
                  <ExecutiveSelector
                    value={field.value}
                    onChange={(id, exec) => {
                      field.onChange(id);
                      setSelectedExecutive(exec ?? null);
                    }}
                    initialRecord={selectedExecutive ?? undefined}
                    hasError={!!errors.executiveId}
                    excludeId={requesterId}
                    disabled={lockExecutive}
                  />
                )}
              />
              {errors.executiveId && <span className="text-xs font-medium text-red-500 pl-1">{errors.executiveId.message}</span>}
              {lockExecutive && (
                <span className="mt-1.5 inline-flex items-center gap-1.5 text-11.5 text-slate-400 dark:text-slate-500">
                  <Lock size={11} className="shrink-0" />
                  {t('leadership_schedule.executive_locked_hint')}
                </span>
              )}

              {values.date && (
                <LeaderAvailabilityPanel
                  entries={availabilityEntries}
                  loading={daySlotsLoading}
                  requesterId={requesterId}
                  requesterName={requesterName}
                  requesterAvatarUrl={requesterAvatarUrl}
                  executiveId={values.executiveId || undefined}
                  executiveName={executive?.fullname}
                  executiveAvatarUrl={executive?.avatarUrl}
                  date={values.date}
                  onOpenCalendarTab={() => setActiveTab('leader-calendar')}
                />
              )}
            </FormSectionCard>

            {/* Section 2: General Registration Info */}
            <FormSectionCard number={2} title={t('leadership_schedule.field_title')} icon={<FileText size={15} />} className="flex-1">
              <div className="flex flex-col justify-between flex-1 gap-3">
                {/* Title + Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1">
                      {fieldLabel(t('leadership_schedule.field_title'))}
                      {requiredMark}
                    </span>
                    <input
                      {...register('title')}
                      placeholder={t('leadership_schedule.field_title_placeholder')}
                      className={cn(inputClass, errors.title && '!border-red-400 dark:!border-red-500')}
                    />
                    {errors.title && <span className="text-xs font-medium text-red-500 pl-1">{errors.title.message}</span>}
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {fieldLabel(t('leadership_schedule.field_priority_short'))}
                    <Controller
                      control={control}
                      name="priority"
                      render={({ field }) => (
                        <AntdSelect
                          size="large"
                          value={field.value}
                          onChange={field.onChange}
                          options={withPriorityColor(priorityOptions.filter((o) => o.value !== 'all'))}
                          className="w-[200px] premium-select h-10 [&_.ant-select-selection-item]:!text-[13px] font-medium [&_.ant-select-selection-item]:!font-normal [&_.ant-select-selection-item]:!text-slate-700 dark:[&_.ant-select-selection-item]:!text-slate-200"
                          classNames={{ popup: { root: 'premium-select-dropdown' } }}
                          placeholder={t('leadership_schedule.field_priority_placeholder')}
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Multi-day toggle */}
                <div className="flex items-center gap-2.5">
                  <label
                    className={cn(
                      'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border cursor-pointer select-none transition-colors',
                      values.isMultiDay
                        ? 'border-[#00529C]/30 bg-[#00529C]/5 dark:border-blue-500/30 dark:bg-blue-500/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-[#00529C]/30'
                    )}
                    title={t('leadership_schedule.field_multi_day_hint')}
                  >
                    <input
                      type="checkbox"
                      checked={values.isMultiDay}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setValue('isMultiDay', checked);
                        if (!checked) setValue('endDate', values.date);
                      }}
                      className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 text-[#00529C] focus:ring-[#00529C]/30 cursor-pointer"
                    />
                    <span
                      className={cn(
                        'text-12.5 font-semibold',
                        values.isMultiDay ? 'text-[#00529C] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {t('leadership_schedule.field_multi_day')}
                    </span>
                  </label>
                </div>

                {/* Date & Time Pickers */}
                <div
                  className={cn(
                    'grid gap-3',
                    values.isMultiDay ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'
                  )}
                >
                  {values.isMultiDay ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex items-center gap-1">
                          {fieldLabel(t('leadership_schedule.field_date_from'))}
                          {requiredMark}
                        </span>
                        <DatePicker
                          size="large"
                          className="w-full"
                          value={values.date ? dayjs(values.date) : null}
                          format="DD/MM/YYYY"
                          disabledDate={(d) => d.isBefore(dayjs(), 'day')}
                          onChange={(d) => {
                            if (!d) return;
                            const next = d.format('YYYY-MM-DD');
                            setValue('date', next);
                            if (values.endDate && values.endDate < next) setValue('endDate', next);
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex items-center gap-1">
                          {fieldLabel(t('leadership_schedule.field_date_to'))}
                          {requiredMark}
                        </span>
                        <DatePicker
                          size="large"
                          className="w-full"
                          value={values.endDate ? dayjs(values.endDate) : null}
                          format="DD/MM/YYYY"
                          disabledDate={(d) => d.isBefore(dayjs(values.date || undefined), 'day')}
                          onChange={(d) => setValue('endDate', d ? d.format('YYYY-MM-DD') : values.date)}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <span className="inline-flex items-center gap-1">
                        {fieldLabel(t('leadership_schedule.field_date_single'))}
                        {requiredMark}
                      </span>
                      <DatePicker
                        size="large"
                        className="w-full"
                        value={values.date ? dayjs(values.date) : null}
                        format="DD/MM/YYYY"
                        disabledDate={(d) => d.isBefore(dayjs(), 'day')}
                        onChange={(d) => {
                          if (!d) return;
                          const next = d.format('YYYY-MM-DD');
                          setValue('date', next);
                          setValue('endDate', next);
                        }}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <span className="inline-flex items-center gap-1">
                      {fieldLabel(t('leadership_schedule.field_start_time'))}
                      {requiredMark}
                    </span>
                    <TimePicker
                      size="large"
                      className="w-full"
                      status={errors.startTime ? 'error' : undefined}
                      value={values.startTime ? dayjs(values.startTime, 'HH:mm') : null}
                      format="HH:mm"
                      minuteStep={5}
                      onChange={(time) => setValue('startTime', time ? time.format('HH:mm') : '', { shouldValidate: true })}
                    />
                    {errors.startTime && <span className="text-xs font-medium text-red-500 pl-1">{errors.startTime.message}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="inline-flex items-center gap-1">
                      {fieldLabel(t('leadership_schedule.field_end_time'))}
                      {requiredMark}
                    </span>
                    <TimePicker
                      size="large"
                      className="w-full"
                      value={endTime ? dayjs(endTime, 'HH:mm') : null}
                      format="HH:mm"
                      minuteStep={5}
                      onChange={(time) => {
                        if (!time || !values.startTime) return;
                        const diff = time.diff(dayjs(values.startTime, 'HH:mm'), 'minute');
                        if (diff > 0) setValue('durationMinutes', diff, { shouldValidate: true });
                      }}
                    />
                  </div>
                </div>

                {/* Embedded Time Slot Picker & Duration Pills */}
                <div className="mt-1 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#00529C] dark:text-blue-400">
                        <Sparkles size={15} />
                      </div>
                      <span className="text-13 font-medium text-slate-800 dark:text-slate-100">
                        {t('leadership_schedule.field_time_slot') || 'Thời gian đề xuất'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-12 text-slate-400 dark:text-slate-500 font-normal">
                        {t('leadership_schedule.field_duration') || 'Thời lượng'}:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {DURATION_OPTIONS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setValue('durationMinutes', d, { shouldValidate: true })}
                            className={cn(
                              'h-7 px-3 rounded-full text-12 font-medium cursor-pointer transition-all duration-200 border select-none',
                              values.durationMinutes === d
                                ? 'border-[#00529C]/50 dark:border-blue-400/70 bg-blue-50/70 dark:bg-blue-950/40 text-[#00529C] dark:text-blue-400 font-medium shadow-xs hover:bg-blue-100/80 hover:border-[#00529C]/70'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-[#00529C]/40 hover:bg-blue-50/50 hover:text-[#00529C] hover:shadow-2xs'
                            )}
                          >
                            {t('leadership_schedule.duration_minutes', { count: d })}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <TimeSlotPicker
                    executiveId={values.executiveId || undefined}
                    slots={daySlots}
                    loading={daySlotsLoading}
                    date={values.date}
                    onDateChange={(d) => setValue('date', d)}
                    durationMinutes={values.durationMinutes}
                    selectedStart={values.startTime || undefined}
                    onSelectStart={(start) => setValue('startTime', start, { shouldValidate: true })}
                  />
                  {errors.startTime && <span className="block mt-1 text-xs font-medium text-red-500">{errors.startTime.message}</span>}
                </div>

                {detailedConflict?.hasConflict && (
                  <div
                    className={cn(
                      'rounded-xl border border-dashed p-3.5 sm:p-4',
                      detailedConflict.conflictSource === 'requester'
                        ? 'border-amber-300 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/25 text-amber-900 dark:text-amber-200'
                        : 'border-red-300 dark:border-red-800/60 bg-red-50/70 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {detailedConflict.conflictSource === 'requester' ? (
                        <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      ) : (
                        <AlertTriangle size={18} className="shrink-0 text-red-500 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            'text-13.5 font-medium leading-snug',
                            detailedConflict.conflictSource === 'requester'
                              ? 'text-amber-800 dark:text-amber-300'
                              : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {detailedConflict.conflictSource === 'requester'
                            ? t('leadership_schedule.conflict_requester_title')
                            : detailedConflict.conflictSource === 'both'
                              ? t('leadership_schedule.conflict_both_title')
                              : t('leadership_schedule.conflict_warning_title')}
                        </div>

                        <div
                          className={cn(
                            'text-12.5 mt-1 leading-relaxed',
                            detailedConflict.conflictSource === 'requester'
                              ? 'text-amber-800/90 dark:text-amber-300/90'
                              : 'text-red-600/90 dark:text-red-400/90'
                          )}
                        >
                          {detailedConflict.conflictSource === 'requester' ? (
                            <>
                              {t('leadership_schedule.conflict_requester_detail', {
                                start: detailedConflict.start,
                                end: detailedConflict.end,
                              })}
                              <div className="mt-1 font-medium text-amber-900 dark:text-amber-200">
                                {t('leadership_schedule.conflict_requester_suggestion')}
                              </div>
                            </>
                          ) : values.isMultiDay ? (
                            t('leadership_schedule.conflict_warning_detail_multiday', {
                              date: dayjs(detailedConflict.date).format('DD/MM/YYYY'),
                              start: detailedConflict.start,
                              end: detailedConflict.end,
                            })
                          ) : (
                            t('leadership_schedule.conflict_warning_detail', {
                              start: detailedConflict.start,
                              end: detailedConflict.end,
                            })
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 flex-wrap">
                          <span className="text-11.5 text-slate-500 dark:text-slate-400">
                            {t('leadership_schedule.conflict_compare_hint')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('leader-calendar')}
                            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00529C] to-[#0072CE] dark:from-blue-600 dark:to-blue-500 px-4 py-2 text-[12px] font-medium text-white shadow-sm shadow-[#00529C]/25 dark:shadow-blue-500/25 transition-all duration-150 hover:shadow-md hover:shadow-[#00529C]/35 hover:-translate-y-0.5 active:scale-[0.98] select-none cursor-pointer focus:outline-none"
                          >
                            <span>{t('leadership_schedule.tab_leader_calendar')}</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!timeConflict && outsideWorkingWindow && values.startTime && (
                  <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <CalendarClock size={16} className="shrink-0 text-amber-500 mt-0.5" />
                      <div className="min-w-0 text-13 text-amber-700 dark:text-amber-400/90">
                        {t('leadership_schedule.window_limit_notice', {
                          windowStart: MEETING_WINDOW_START,
                          windowEnd: MEETING_WINDOW_END,
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Location & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 items-start">
                  <div className="flex flex-col gap-1.5">
                    <span className="inline-flex items-center gap-1 h-5">
                      {fieldLabel(t('leadership_schedule.field_location'))}
                      {requiredMark}
                    </span>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00529C] dark:text-blue-400 pointer-events-none" />
                      <input
                        {...register('location')}
                        placeholder={t('leadership_schedule.field_location_placeholder')}
                        className={cn(inputClass, 'pl-9', errors.location && '!border-red-400 dark:!border-red-500')}
                      />
                    </div>
                    {errors.location && <span className="text-xs font-medium text-red-500 pl-1">{errors.location.message}</span>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="inline-flex items-center gap-1 h-5">
                      {fieldLabel(t('leadership_schedule.field_type'))}
                      {requiredMark}
                    </span>
                    <Controller
                      control={control}
                      name="scheduleTypeId"
                      render={({ field }) => (
                        <AntdSelect
                          size="large"
                          value={field.value || undefined}
                          onChange={field.onChange}
                          status={errors.scheduleTypeId ? 'error' : undefined}
                          options={scheduleTypeOptions}
                          showSearch
                          optionFilterProp="label"
                          className="w-full premium-select h-10 [&_.ant-select-selection-item]:!text-[13px] [&_.ant-select-selection-item]:!font-normal [&_.ant-select-selection-item]:!text-slate-700 dark:[&_.ant-select-selection-item]:!text-slate-200"
                          classNames={{ popup: { root: 'premium-select-dropdown' } }}
                          placeholder={t('leadership_schedule.field_type_placeholder')}
                        />
                      )}
                    />
                    {errors.scheduleTypeId && <span className="text-xs font-medium text-red-500 pl-1">{errors.scheduleTypeId.message}</span>}
                  </div>
                </div>

                {/* Meeting Format */}
                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    {fieldLabel(t('leadership_schedule.field_format'))}
                    {requiredMark}
                  </span>
                  <Controller
                    control={control}
                    name="meetingFormat"
                    render={({ field }) => (
                      <div className="relative inline-flex w-[224px] p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-full border border-slate-200/80 dark:border-slate-700/70 h-[38px]">
                        <span
                          aria-hidden
                          className="absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/2)] rounded-full bg-white dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 shadow-sm transition-transform duration-300 ease-out"
                          style={{
                            transform: `translateX(${MEETING_FORMAT_OPTIONS.findIndex((opt) => opt.value === field.value) * 100}%)`,
                          }}
                        />
                        {MEETING_FORMAT_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const isActive = field.value === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className={cn(
                                'relative z-10 flex-1 h-full rounded-full text-13 font-medium transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer select-none',
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
                    )}
                  />
                </div>
              </div>
            </FormSectionCard>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4 min-w-0 h-full">
            {/* Section 3: Participants */}
            <FormSectionCard number={3} title={t('leadership_schedule.field_participants')} icon={<Users size={15} />}>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1.5">
                  {fieldLabel(t('leadership_schedule.field_participants_department'))}
                  <DepartmentTreeSelect
                    value={participantDepartmentId ?? undefined}
                    onChange={(id) => setParticipantDepartmentId(id || null)}
                    allowClear
                    onClear={() => setParticipantDepartmentId(null)}
                    placeholder={t('leadership_schedule.field_participants_department_placeholder')}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  {fieldLabel(t('leadership_schedule.field_participants'))}
                  <Controller
                    control={control}
                    name="participants"
                    render={({ field }) => (
                      <PagedPickerSelect<Employee>
                        key={`participants-${participantDepartmentId || 'all'}`}
                        multiple
                        initialRecords={initialParticipantRecords}
                        fetchPage={fetchParticipants}
                        getValue={(e) => e.id}
                        getLabel={(e) => e.fullname}
                        renderOption={(e) => {
                          const phone = e.phone || e.phoneNumber;
                          const jobInfo = [e.jobTitleName, e.departmentName].filter(Boolean).join(' · ');
                          return (
                            <div className="flex items-center gap-2.5 py-0.5">
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
                          field.onChange(records.map((r) => ({ id: r.id, name: r.fullname, email: r.email, code: r.employeeCode })));
                        }}
                        placeholder={t('leadership_schedule.field_participants_placeholder')}
                      />
                    )}
                  />
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={values.isSendEmail ?? false}
                    onChange={(e) => setValue('isSendEmail', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#00529C] focus:ring-[#00529C]/30 cursor-pointer"
                  />
                  <span className="text-13 text-slate-600 dark:text-slate-300">
                    {t('leadership_schedule.field_send_email', { defaultValue: 'Gửi email thông báo cho người nhận' })}
                  </span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={values.isConfidential ?? false}
                    onChange={(e) => setValue('isConfidential', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#00529C] focus:ring-[#00529C]/30 cursor-pointer"
                  />
                  <span className="text-13 text-slate-600 dark:text-slate-300">
                    {t('leadership_schedule.field_confidential')}
                  </span>
                </label>

              </div>
            </FormSectionCard>

            {/* Section 4: Content & Attachments */}
            <FormSectionCard number={4} title={t('leadership_schedule.section_content')} icon={<FileText size={15} />} className="flex-1">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1">
                    {fieldLabel(t('leadership_schedule.field_description'))}
                    {requiredMark}
                  </span>
                  {errors.description && <span className="text-xs font-medium text-red-500">{errors.description.message}</span>}
                </div>
                <div className="custom-quill">
                  <DescriptionEditor
                    value={values.description || ''}
                    onChange={handleDescriptionChange}
                    modules={quillModules}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-1">
                {fieldLabel(t('leadership_schedule.field_note'))}
                <textarea
                  {...register('note')}
                  rows={2}
                  placeholder={t('leadership_schedule.note_placeholder')}
                  className={textareaClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div className="flex flex-col gap-1.5">
                  {fieldLabel(t('leadership_schedule.field_attachments'))}
                  <FileAttachmentInput
                    files={attachments}
                    onChange={(files) => setValue('attachments', files)}
                    maxFiles={5}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5">
                      {fieldLabel(t('leadership_schedule.field_link'))}
                      {links.filter((l) => l.trim()).length > 0 && (
                        <span className="text-11 font-semibold text-[#00529C] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/50">
                          {links.filter((l) => l.trim()).length}/3
                        </span>
                      )}
                    </span>
                    {links.length < 3 ? (
                      <button
                        type="button"
                        onClick={() => setValue('links', links.length < 3 ? [...links, ''] : links)}
                        className="inline-flex items-center gap-1 text-12 font-semibold text-[#00529C] dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <Link2 size={14} />
                        <span>{t('leadership_schedule.link_add_btn')}</span>
                      </button>
                    ) : (
                      <span className="text-11 font-medium text-slate-400 dark:text-slate-500">{t('leadership_schedule.link_max_hint')}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {links.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          value={link}
                          onChange={(e) => {
                            const next = [...links];
                            next[idx] = e.target.value;
                            setValue('links', next);
                          }}
                          placeholder={t('leadership_schedule.link_placeholder')}
                          className={inputClass}
                        />
                        {links.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setValue('links', links.filter((_, i) => i !== idx))}
                            className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/50 cursor-pointer transition-colors"
                            title={t('leadership_schedule.link_remove')}
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
        onCancel={offerSaveDraft ? handleSaveDraft : onClose}
        cancelText={offerSaveDraft ? t('leadership_schedule.modal_save_draft') : t('leadership_schedule.cancel_form_btn')}
        cancelIcon={offerSaveDraft ? <Save size={15} /> : <X size={15} />}
        submitText={isPendingEdit ? t('leadership_schedule.update_btn') : t('leadership_schedule.submit_btn')}
        submitIcon={offerSaveDraft ? <CalendarPlus size={15} /> : <Save size={15} />}
        loading={loading}
        htmlType="button"
        onSubmit={submit}
        className={footerGradient}
      />
      </>
      ) : (
        <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
          <LeaderScheduleComparisonView
            requesterId={requesterId}
            requesterName={requesterName}
            requesterAvatarUrl={requesterAvatarUrl}
            executiveId={values.executiveId || undefined}
            executiveName={selectedExecutive?.fullname}
            executiveAvatarUrl={selectedExecutive?.avatarUrl}
            selectedExecutive={selectedExecutive}
            onExecutiveChange={(id, exec) => {
              setValue('executiveId', id, { shouldValidate: true });
              setSelectedExecutive(exec ?? null);
            }}
            disabledExecutiveSelect={lockExecutive}
            date={values.date ? dayjs(values.date) : dayjs()}
            durationMinutes={values.durationMinutes}
            onSelectSlot={(dateStr, startStr, dur) => {
              setValue('date', dateStr, { shouldDirty: true });
              if (!values.isMultiDay || !values.endDate || values.endDate < dateStr) setValue('endDate', dateStr);
              setValue('startTime', startStr, { shouldValidate: true, shouldDirty: true });
              if (dur) setValue('durationMinutes', dur);
              setActiveTab('form');
              toast.success(
                t('leadership_schedule.slot_selected_toast', {
                  start: startStr,
                  end: computeEndTime(startStr, dur || values.durationMinutes),
                })
              );
            }}
            onBackToForm={() => setActiveTab('form')}
          />
        </div>
      )}
    </FormModal>

    <ConfirmModal
      open={showDraftPrompt}
      onCancel={() => {
        setShowDraftPrompt(false);
        onClose();
      }}
      onClose={() => setShowDraftPrompt(false)}
      onConfirm={() => {
        setShowDraftPrompt(false);
        handleSaveDraft();
      }}
      title={t('leadership_schedule.draft_prompt_title')}
      description={t('leadership_schedule.draft_prompt_desc')}
      confirmText={t('leadership_schedule.draft_prompt_save')}
      confirmIcon={<Save size={15} />}
      cancelText={t('leadership_schedule.draft_prompt_discard')}
      variant="draft"
      zIndex={1400}
    />
    </>
  );
};

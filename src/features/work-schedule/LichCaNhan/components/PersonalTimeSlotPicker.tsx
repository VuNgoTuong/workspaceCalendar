import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Loader2, Check } from 'lucide-react';
import { cn } from '../../../../utils/helpers';
import { useMinuteTick } from '../../../../hooks';
import { isRangeAvailable, rankSuggestedSlots, type TimeSlot } from '../../DangKyLichLanhDao/utils/timeSlots';
import { TimeSlotHintBar } from '../../components/TimeSlotHintBar';

const SUGGESTION_LIMIT = 4;

interface PersonalTimeSlotPickerProps {
  slots: TimeSlot[];
  loading?: boolean;
  date: string;
  onDateChange?: (date: string) => void;
  durationMinutes: number;
  selectedStart?: string;
  onSelectStart: (start: string) => void;
}

export const PersonalTimeSlotPicker: React.FC<PersonalTimeSlotPickerProps> = ({
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
    () => (bookableSlots.length ? rankSuggestedSlots(bookableSlots, durationMinutes, SUGGESTION_LIMIT) : []),
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

  return (
    <div className="flex flex-col gap-3">

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-6 text-12.5 text-slate-400 dark:text-slate-500">
          <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
          <span>{t('personal_calendar.slot_loading')}</span>
        </div>
      ) : !hasAnyAvailable ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-4 text-center text-12.5 text-slate-400 dark:text-slate-500">
          {t('personal_calendar.slot_no_available')}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {displayStarts.map((start) => {
            const isSelected = selectedStart === start;
            const isAvailable = isRangeAvailable(bookableSlots, start, durationMinutes);
            const isPreferred = preferredStart === start && isAvailable;
            const subtext = !isAvailable
              ? t('personal_calendar.slot_unavailable')
              : isPreferred && !isSelected
                ? t('personal_calendar.slot_preferred')
                : null;

            return (
              <button
                key={start}
                type="button"
                disabled={!isAvailable}
                onClick={() => {
                  if (!isAvailable) return;
                  if (isSelected) {
                    onSelectStart('');
                  } else {
                    onSelectStart(start);
                  }
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

export default PersonalTimeSlotPicker;

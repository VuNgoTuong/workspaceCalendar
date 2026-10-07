import { useEffect, useRef } from 'react';
import type { Dayjs } from 'dayjs';

export type DayRange = [Dayjs, Dayjs];

const monthRange = (date: Dayjs): DayRange => [date.startOf('month'), date.endOf('month')];

export const isAutoMonthRange = (range: DayRange | null | undefined, calendarDate: Dayjs, active: boolean) => {
  if (!active || !range) return false;
  const [start, end] = monthRange(calendarDate);
  return range[0].isSame(start, 'day') && range[1].isSame(end, 'day');
};

interface CalendarRangeSyncOptions {
  active: boolean;
  calendarDate: Dayjs;
  setCalendarDate: (date: Dayjs) => void;
  range: DayRange | null;
  setRange: (range: DayRange | null) => void;
}

export const useCalendarRangeSync = ({ active, calendarDate, setCalendarDate, range, setRange }: CalendarRangeSyncOptions) => {
  const monthKey = calendarDate.format('YYYY-MM');
  const hasRange = !!range;
  const fromPickerRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    if (fromPickerRef.current && hasRange) {
      fromPickerRef.current = false;
      return;
    }
    fromPickerRef.current = false;
    const [start, end] = monthRange(calendarDate);
    if (!range || !range[0].isSame(start, 'day') || !range[1].isSame(end, 'day')) setRange([start, end]);
  }, [active, monthKey, hasRange]);

  return (next: DayRange | null) => {
    setRange(next);
    if (active && next) {
      fromPickerRef.current = next[0].format('YYYY-MM') !== monthKey;
      setCalendarDate(next[0]);
    }
  };
};

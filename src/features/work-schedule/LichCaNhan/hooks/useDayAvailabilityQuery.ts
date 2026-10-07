import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { scheduleOccurrenceAPI, type IUserAvailability } from '../../../../services/api/scheduleOccurrenceAPI';

export interface DayAvailabilityExclude {
  scheduleOccurrenceId?: string;
  scheduleId?: string;
}

interface DayAvailabilityParams {
  userIdsRaw: string;
  date: string | undefined;
  endDate: string | undefined;
  excludeScheduleOccurrenceId: string | undefined;
  excludeScheduleId: string | undefined;
}

export const useDayAvailabilityQuery = (
  userIds: string[],
  date: string | undefined,
  active: boolean,
  exclude?: DayAvailabilityExclude,
  endDate?: string
) => {
  const userIdsRaw = userIds.slice().sort().join(',');
  const excludeScheduleOccurrenceId = exclude?.scheduleOccurrenceId;
  const excludeScheduleId = exclude?.scheduleId;
  const [applied, setApplied] = useState<DayAvailabilityParams>({
    userIdsRaw,
    date,
    endDate,
    excludeScheduleOccurrenceId,
    excludeScheduleId,
  });
  const wasActive = useRef(false);

  useEffect(() => {
    if (!active) return;
    if (!wasActive.current) {
      wasActive.current = true;
      setApplied({ userIdsRaw, date, endDate, excludeScheduleOccurrenceId, excludeScheduleId });
      return;
    }
    const handler = setTimeout(
      () => setApplied({ userIdsRaw, date, endDate, excludeScheduleOccurrenceId, excludeScheduleId }),
      400
    );
    return () => clearTimeout(handler);
  }, [active, userIdsRaw, date, endDate, excludeScheduleOccurrenceId, excludeScheduleId]);

  useEffect(() => {
    if (!active) wasActive.current = false;
  }, [active]);

  const debouncedUserIds = applied.userIdsRaw ? applied.userIdsRaw.split(',') : [];
  const enabled = active && wasActive.current && debouncedUserIds.length > 0 && !!applied.date;

  return useQuery<IUserAvailability[]>({
    queryKey: [
      'personal-calendar-day-availability',
      applied.userIdsRaw,
      applied.date,
      applied.endDate,
      applied.excludeScheduleOccurrenceId,
      applied.excludeScheduleId,
    ],
    queryFn: () =>
      scheduleOccurrenceAPI.checkAvailability({
        userIds: debouncedUserIds,
        startDate: dayjs(applied.date).startOf('day').toISOString(),
        endDate: dayjs(applied.endDate || applied.date).endOf('day').toISOString(),
        excludeScheduleOccurrenceId: applied.excludeScheduleOccurrenceId,
        excludeScheduleId: applied.excludeScheduleId,
      }),
    enabled,
  });
};

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { scheduleOccurrenceAPI, type IUserAvailability } from '../services/api/scheduleOccurrenceAPI';

interface AvailabilityParams {
  userIdsRaw: string;
  startDate?: string;
  endDate?: string;
}

export const useCheckAvailabilityQuery = (
  userIds: string[],
  startDate: string | undefined,
  endDate: string | undefined,
  active: boolean
) => {
  const userIdsRaw = userIds.slice().sort().join(',');
  const [applied, setApplied] = useState<AvailabilityParams>({ userIdsRaw, startDate, endDate });
  const wasActive = useRef(false);

  useEffect(() => {
    if (!active) return;
    if (!wasActive.current) {
      wasActive.current = true;
      setApplied({ userIdsRaw, startDate, endDate });
      return;
    }
    const handler = setTimeout(() => setApplied({ userIdsRaw, startDate, endDate }), 400);
    return () => clearTimeout(handler);
  }, [active, userIdsRaw, startDate, endDate]);

  useEffect(() => {
    if (!active) wasActive.current = false;
  }, [active]);

  const debouncedUserIds = useMemo(() => (applied.userIdsRaw ? applied.userIdsRaw.split(',') : []), [applied.userIdsRaw]);
  const enabled = active && wasActive.current && debouncedUserIds.length > 0 && !!applied.startDate && !!applied.endDate;

  return useQuery<IUserAvailability[]>({
    queryKey: ['schedule-availability', applied.userIdsRaw, applied.startDate, applied.endDate],
    queryFn: () =>
      scheduleOccurrenceAPI.checkAvailability({
        userIds: debouncedUserIds,
        startDate: applied.startDate!,
        endDate: applied.endDate!,
      }),
    enabled,
  });
};

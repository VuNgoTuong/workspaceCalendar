import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '../../../../store/authStore';
import { useActingLeaderStore } from '../../../../store/actingLeaderStore';
import { scheduleOccurrenceAPI, getMonthDateRange, type IScheduleOccurrenceCalendarItem } from '../../../../services/api/scheduleOccurrenceAPI';
import type { ScheduleCalendarType } from '../../../../constants/scheduleCalendarType';

const QUERY_KEY = ['schedule-calendar-overview'];

export const useOverviewLeaderId = () => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  return actingLeaderId || currentUserId;
};

export interface CalendarOverviewQueryParams {
  year: number;
  month: number;
  operatingLeaderId?: string;
  calendarTypes: ScheduleCalendarType[];
}

export const useCalendarOverviewQuery = (params: CalendarOverviewQueryParams) => {
  return useQuery<IScheduleOccurrenceCalendarItem[]>({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => {
      const { year, month, ...rest } = params;
      return scheduleOccurrenceAPI.getScheduleOccurrencesCalendar({
        ...rest,
        ...getMonthDateRange(year, month),
        IsGetCalendarActive: true,
      });
    },
    enabled: !!params.operatingLeaderId,
    placeholderData: keepPreviousData,
  });
};

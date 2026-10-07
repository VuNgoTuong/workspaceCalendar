import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { scheduleTypeAPI } from '../../../../services/api/scheduleTypeAPI';
import type {
  IScheduleType,
  IScheduleTypeListParams,
  IScheduleTypeListResponse,
  IScheduleTypeRequest,
} from '../../../../services/api/scheduleTypeAPI';

export const useScheduleTypesQuery = (params?: IScheduleTypeListParams, options?: { enabled?: boolean }) => {
  return useQuery<IScheduleTypeListResponse>({
    queryKey: ['schedule-types', params],
    queryFn: () => scheduleTypeAPI.getScheduleTypes(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
};

export const useCreateScheduleTypeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IScheduleTypeRequest) => scheduleTypeAPI.createScheduleType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-types'] });
    },
  });
};

export const useUpdateScheduleTypeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IScheduleTypeRequest }) =>
      scheduleTypeAPI.updateScheduleType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-types'] });
    },
  });
};

export const useDeleteScheduleTypeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduleTypeAPI.deleteScheduleType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-types'] });
    },
  });
};

export type { IScheduleType };

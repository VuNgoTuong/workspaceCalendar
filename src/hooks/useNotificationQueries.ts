import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationAPI } from '../services/api/notificationAPI';
import type { INotification, INotificationParams, INotificationListResponse } from '../services/api/notificationAPI';

const invalidateNotifications = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
  queryClient.invalidateQueries({ queryKey: ['notifications-total-unread'] });
};

export const useNotificationsQuery = (params?: INotificationParams, enabled = true) => {
  return useQuery<INotificationListResponse>({
    queryKey: ['notifications', params],
    queryFn: () => notificationAPI.getNotifications(params),
    enabled,
    staleTime: Infinity,
    refetchOnMount: false,
  });
};

export const useUnreadNotificationsQuery = (enabled = true) => {
  return useQuery<INotification[]>({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationAPI.getUnreadNotifications(),
    enabled,
    staleTime: Infinity,
    refetchOnMount: false,
  });
};

export const useTotalUnreadCountQuery = () => {
  return useQuery<number>({
    queryKey: ['notifications-total-unread'],
    queryFn: async () => {
      const response = await notificationAPI.getTotalUnreadCount();
      return Array.isArray(response) ? response.length : response;
    },
    staleTime: Infinity,
    refetchOnMount: false,
  });
};

export const useMarkAsReadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationAPI.markAsRead(id),
    onSuccess: () => invalidateNotifications(queryClient),
  });
};

export const useBulkSeenMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationAPI.bulkSeen(),
    onSuccess: () => invalidateNotifications(queryClient),
  });
};

export const useDeleteNotificationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationAPI.deleteNotification(id),
    onSuccess: () => invalidateNotifications(queryClient),
  });
};

export const useBulkDeleteNotificationsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationAPI.bulkDelete(),
    onSuccess: () => invalidateNotifications(queryClient),
  });
};

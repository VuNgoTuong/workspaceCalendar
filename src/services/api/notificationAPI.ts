import { baseAPI } from './baseAPI';

export interface INotification {
  id: string;
  receiverId: string;
  type: number;
  title: string;
  content: string;
  isRead: boolean;
  status: number;
  failureReason?: string;
  retryCount: number;
  createdAt: string;
  code?: string;
}

export interface INotificationParams {
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  IsAscending?: boolean;
}

export interface INotificationListResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: INotification[];
}

export interface INotificationSendPayload {
  receiverId: string;
  type: number;
  title: string;
  content: string;
}

export const notificationAPI = {
  getNotifications: (params?: INotificationParams): Promise<INotificationListResponse> =>
    baseAPI.get<INotificationListResponse>('/Notifications', { params }),

  getUnreadNotifications: (): Promise<INotification[]> =>
    baseAPI.get<INotification[]>('/Notifications/unread'),

  getTotalUnreadCount: (): Promise<number | INotification[]> =>
    baseAPI.get<number | INotification[]>('/Notifications/total-unread'),

  getNotificationById: (id: string): Promise<INotification> =>
    baseAPI.get<INotification>(`/Notifications/${id}`),

  sendNotification: (data: INotificationSendPayload): Promise<INotification> =>
    baseAPI.post<INotification>('/Notifications/send', data),

  markAsRead: (id: string): Promise<void> =>
    baseAPI.put<void>(`/Notifications/${id}/mark-as-read`),

  bulkSeen: (): Promise<void> =>
    baseAPI.put<void>('/Notifications/bulk-seen'),

  deleteNotification: (id: string): Promise<void> =>
    baseAPI.delete<void>(`/Notifications/${id}`),

  bulkDelete: (): Promise<void> =>
    baseAPI.delete<void>('/Notifications/bulk-delete'),
};

export default notificationAPI;

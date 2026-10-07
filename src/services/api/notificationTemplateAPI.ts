import { baseAPI } from './baseAPI';
import type {
  INotificationTemplate,
  INotificationTemplateRequest,
  INotificationTemplateListResponse,
  INotificationTemplateKey,
  INotificationTemplateParam,
} from '../../features/system/types';

export interface INotificationTemplateListParams {
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  IsAscending?: boolean;
  searchTerm?: string;
}

export const notificationTemplateAPI = {
  getTemplates: (params?: INotificationTemplateListParams): Promise<INotificationTemplateListResponse> =>
    baseAPI.get<INotificationTemplateListResponse>('/NotificationTemplates', { params }),

  getTemplateById: (id: string): Promise<INotificationTemplate> =>
    baseAPI.get<INotificationTemplate>(`/NotificationTemplates/${id}`),

  createTemplate: (data: INotificationTemplateRequest): Promise<INotificationTemplate> =>
    baseAPI.post<INotificationTemplate>('/NotificationTemplates', data),

  updateTemplate: (id: string, data: INotificationTemplateRequest): Promise<INotificationTemplate> =>
    baseAPI.put<INotificationTemplate>(`/NotificationTemplates/${id}`, data),

  deleteTemplate: (id: string): Promise<void> =>
    baseAPI.delete<void>(`/NotificationTemplates/${id}`),

  getAvailableKeys: (): Promise<INotificationTemplateKey[]> =>
    baseAPI.get<INotificationTemplateKey[]>('/NotificationTemplates/available-keys'),

  getParams: (): Promise<INotificationTemplateParam[]> =>
    baseAPI.get<INotificationTemplateParam[]>('/NotificationTemplates/params'),
};

export default notificationTemplateAPI;

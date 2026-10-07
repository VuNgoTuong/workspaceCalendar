import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationTemplateAPI } from '../../../../services/api/notificationTemplateAPI';
import type { INotificationTemplateListParams } from '../../../../services/api/notificationTemplateAPI';
import type {
  INotificationTemplate,
  INotificationTemplateRequest,
  INotificationTemplateListResponse,
  INotificationTemplateKey,
  INotificationTemplateParam,
} from '../../types';

export const useNotificationTemplatesQuery = (params?: INotificationTemplateListParams) => {
  return useQuery<INotificationTemplateListResponse>({
    queryKey: ['notification-templates', params],
    placeholderData: keepPreviousData,
    queryFn: () => notificationTemplateAPI.getTemplates(params),
  });
};

export const useAvailableKeysQuery = () => {
  return useQuery<INotificationTemplateKey[]>({
    queryKey: ['notification-template-keys'],
    queryFn: () => notificationTemplateAPI.getAvailableKeys(),
  });
};

export const useTemplateParamsQuery = () => {
  return useQuery<INotificationTemplateParam[]>({
    queryKey: ['notification-template-params'],
    queryFn: () => notificationTemplateAPI.getParams(),
  });
};

export const useCreateTemplateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: INotificationTemplateRequest) => notificationTemplateAPI.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
  });
};

export const useUpdateTemplateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: INotificationTemplateRequest }) =>
      notificationTemplateAPI.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
  });
};

export const useDeleteTemplateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationTemplateAPI.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
  });
};

export type { INotificationTemplate };

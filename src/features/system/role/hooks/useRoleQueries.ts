import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleAPI } from '../../../../services/api/roleAPI';
import type { IRole } from '../../../../services/api/roleAPI';

export const useRolesQuery = (params?: { PageNumber?: number; PageSize?: number; search?: string }) => {
  return useQuery<{ items: IRole[]; totalCount: number }>({
    queryKey: ['roles', params],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await roleAPI.getRoles(params);
      return {
        items: response?.items || [],
        totalCount: response?.totalCount || 0,
      };
    },
  });
};

export const useCreateRoleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      return await roleAPI.createRole(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
};

export const useUpdateRoleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await roleAPI.updateRole(id, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
};

export const useDeleteRoleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await roleAPI.deleteRole(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
};

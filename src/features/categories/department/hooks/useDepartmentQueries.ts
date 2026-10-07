import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { departmentAPI } from '../../../../services/api/departmentAPI';
import type { IDepartment, IDepartmentListParams, IDepartmentListResponse, IDepartmentUpdatePayload } from '../../../../services/api/departmentAPI';

export const useDepartmentsQuery = (params?: IDepartmentListParams) => {
  return useQuery<IDepartmentListResponse>({
    queryKey: ['departments', params],
    queryFn: () => departmentAPI.getDepartments(params),
    placeholderData: keepPreviousData,
  });
};

const CHILDREN_PAGE_SIZE = 50;

export const fetchDepartmentChildren = async (
  parentId: string | number,
  page: number = 1,
  isActive?: boolean
): Promise<{ items: IDepartment[]; hasMore: boolean }> => {
  const res = await departmentAPI.getDepartments({
    parentId: String(parentId),
    PageNumber: page,
    PageSize: CHILDREN_PAGE_SIZE,
    isActive,
  });
  return { items: res.items || [], hasMore: !!res.hasNextPage };
};

export const useDepartmentByIdQuery = (id: string | null) => {
  return useQuery<IDepartment>({
    queryKey: ['department', id],
    queryFn: () => departmentAPI.getDepartmentById(id as string),
    enabled: !!id,
  });
};

export const useUpdateDepartmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IDepartmentUpdatePayload }) =>
      departmentAPI.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department'] });
    },
  });
};

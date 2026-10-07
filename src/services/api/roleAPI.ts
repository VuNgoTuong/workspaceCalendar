import { baseAPI } from './baseAPI';

export interface IRole {
  id: string;
  name: string;
  isSystemRole?: boolean;
}

export interface IRoleResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: IRole[];
}

export const roleAPI = {
  getRoles: (params?: Record<string, any>): Promise<IRoleResponse> =>
    baseAPI.get<IRoleResponse>('/Roles', { params }),

  getRoleById: (id: string): Promise<IRole> =>
    baseAPI.get<IRole>(`/Roles/${id}`),

  createRole: (data: { name: string }): Promise<IRole> =>
    baseAPI.post<IRole>('/Roles', data),

  updateRole: (id: string, data: { name: string }): Promise<void> =>
    baseAPI.put<void>(`/Roles/${id}`, data),

  deleteRole: (id: string): Promise<void> =>
    baseAPI.delete<void>(`/Roles/${id}`),
};

export default roleAPI;

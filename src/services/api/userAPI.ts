import { baseAPI } from './baseAPI';

export interface IExecutiveUser {
  id: string;
  username: string;
  email: string;
  fullname: string;
  employeeCode?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  unitName?: string | null;
  unitFullPathName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  jobTitleName?: string | null;
  positionName?: string | null;
  roles: string[];
  restrictToDepartmentIds?: { id: string; resourceId: string }[] | null;
}

export interface IExecutiveUserListParams {
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  IsAscending?: boolean;
  searchKeyword?: string;
}

export interface IExecutiveUserListResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: IExecutiveUser[];
}

export const userAPI = {
  getCurrentUser: async (): Promise<any> => {
    return await baseAPI.get<any>('/Users/me');
  },
  getUsers: async (params?: { PageNumber?: number; PageSize?: number; SortBy?: string; IsAscending?: boolean; searchKeyword?: string; RoleId?: string; departmentId?: string; UnitName?: string; Title?: string }): Promise<any> => {
    return await baseAPI.get<any>('/Users', { params });
  },
  getUserById: async (id: string): Promise<any> => {
    return await baseAPI.get<any>(`/Users/${id}`);
  },
  getExecutiveManagement: async (params?: IExecutiveUserListParams): Promise<IExecutiveUserListResponse> => {
    return await baseAPI.get<IExecutiveUserListResponse>('/Users/executive-management', { params });
  },
  updateUser: async (id: string, data: any): Promise<any> => {
    return await baseAPI.put<any>(`/Users/${id}`, data);
  },
  deleteUser: async (id: string): Promise<void> => {
    return await baseAPI.delete<void>(`/Users/${id}`);
  },
  updateUserRoles: async (userId: string, roleIds: string[]): Promise<any> => {
    return await baseAPI.put<any>(`/Users/${userId}/roles`, { roleIds });
  },
};

export default userAPI;

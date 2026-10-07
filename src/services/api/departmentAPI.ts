import { baseAPI } from './baseAPI';

export interface IDepartmentConfig {
  departmentId: string;
  requireApproval: boolean;
  fullPathName?: string;
}

export interface IDepartment {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  isDeleted: boolean | null;
  deletedBy: string | null;
  deletedAt: string | null;
  level: number;
  isActive: boolean;
  departmentConfig: IDepartmentConfig | null;
}

export interface IDepartmentListParams {
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  IsAscending?: boolean;
  search?: string;
  parentId?: string | null;
  level?: number;
  isActive?: boolean;
}

export interface IDepartmentListResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: IDepartment[];
}

export interface IDepartmentUpdatePayload {
  requireApproval?: boolean;
  isActive?: boolean;
}

export interface IAccessibleDepartmentListParams {
  search?: string;
  parentId?: string | null;
}

export const departmentAPI = {
  getDepartments: (params?: IDepartmentListParams): Promise<IDepartmentListResponse> =>
    baseAPI.get<IDepartmentListResponse>('/Departments', { params }),

  getAccessibleDepartments: async (params?: IAccessibleDepartmentListParams): Promise<IDepartment[]> => {
    const res = await baseAPI.get<IDepartmentListResponse | IDepartment[] | string | null>(
      '/Departments/accessible',
      { params }
    );
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object' && Array.isArray(res.items)) return res.items;
    return [];
  },

  getDepartmentById: (id: string): Promise<IDepartment> =>
    baseAPI.get<IDepartment>(`/Departments/${id}`),

  updateDepartment: (id: string, data: IDepartmentUpdatePayload): Promise<void> =>
    baseAPI.patch<void>(`/Departments/${id}`, data),
};

export default departmentAPI;

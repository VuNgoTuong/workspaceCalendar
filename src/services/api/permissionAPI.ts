import { baseAPI } from './baseAPI';
import type {
  IPermissionDefinition,
  IPermissionsMetadata,
  IPaginatedPermissionResponse,
  IPermission,
  IPermissionRequest,
  IGranteeDepartmentPermissions,
} from '../../types/permissionTypes';

export const permissionAPI = {
  getDefinitions: (): Promise<IPermissionDefinition[]> =>
    baseAPI.get<IPermissionDefinition[]>('/Permissions/definitions'),

  getAvailableNames: (): Promise<string[]> =>
    baseAPI.get<string[]>('/Permissions/available-names'),

  getMetadata: (): Promise<IPermissionsMetadata> =>
    baseAPI.get<IPermissionsMetadata>('/Permissions/metadata'),

  getPermissions: (params?: Record<string, any>): Promise<IPaginatedPermissionResponse<IPermission>> =>
    baseAPI.get<IPaginatedPermissionResponse<IPermission>>('/Permissions', { params }),

  /** Department permission grants for a grantee (resourceType = Department). */
  getGranteeDepartmentPermissions: (
    granteeId: string,
    granteeType: number = 1
  ): Promise<IGranteeDepartmentPermissions> =>
    baseAPI.get<IGranteeDepartmentPermissions>(`/Permissions/by-grantee/${granteeId}/departments`, {
      params: { granteeType },
    }),

  getPermissionById: (id: string): Promise<IPermission> =>
    baseAPI.get<IPermission>(`/Permissions/${id}`),

  createPermission: (data: IPermissionRequest): Promise<void> =>
    baseAPI.post<void>('/Permissions', data),

  updatePermission: (id: string, data: IPermissionRequest): Promise<void> =>
    baseAPI.put<void>(`/Permissions/${id}`, data),

  deletePermission: (id: string): Promise<void> =>
    baseAPI.delete<void>(`/Permissions/${id}`),

  getMyPermissions: (params?: Record<string, any>): Promise<IPermission[]> =>
    baseAPI.get<IPermission[]>('/Permissions/my-permissions', { params }),

  getMyPermissionsByResource: (params?: { resourceType?: number; resourceId?: string }): Promise<IPermission[]> =>
    baseAPI.get<IPermission[]>('/Permissions/my-permissions/by-resource', { params }),

  hasPermission: (params: { resourceType: number; permissionValue: number; resourceId?: string }): Promise<boolean> =>
    baseAPI.get<boolean>('/Permissions/my-permissions/has', { params }),

  getRoles: (): Promise<any[]> =>
    baseAPI.get<any>('/Roles').then((data: any) =>
      Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
    ),
};

export default permissionAPI;

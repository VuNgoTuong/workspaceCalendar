export interface IPermissionDefinition {
  name: string;
  value: number;
}

export interface IResourceType {
  value: number;
  name: string;
}

export interface IGranteeType {
  value: number;
  name: string;
}

export interface IPermissionsMetadata {
  permissions: IPermissionDefinition[];
  resourceTypes: IResourceType[];
  granteeTypes: IGranteeType[];
}

export interface IPermission {
  id: string;
  resourceType: number;
  resourceId?: string | null;
  granteeType: number;
  granteeId: string;
  permissions: number;
  isDeny: boolean;
  recursive?: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
  isDeleted: boolean;
}

export interface IPermissionRequest {
  resourceType?: number;
  resourceId?: string;
  granteeType: number;
  granteeId: string;
  permissions: number;
  permissionNames?: string[];
  isDeny: boolean;
  recursive?: boolean;
}

export interface IGranteeDepartmentGrant {
  id: string;
  resourceId: string;
  permissions: number;
  isDeny: boolean;
}

export interface IGranteeDepartmentPermissions {
  granteeId: string;
  granteeType: number;
  resourceType: number;
  grants: IGranteeDepartmentGrant[];
}

export interface IPaginatedPermissionResponse<T> {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: T[];
}

export interface Employee {
  id: string;
  username: string;
  fullname: string;
  email: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  employeeCode?: string | null;
  avatarUrl?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  jobTitleName?: string | null;
  positionName?: string | null;
  roles?: string[] | null;
}

export interface PermissionRow {
  key: string;
  module: string;
  action: string;
  admin: boolean;
  receptionist: boolean;
  manager: boolean;
  employee: boolean;
}

export interface Department {
  key: string;
  deptCode: string;
  name: string;
  manager: string;
  coordinator: string;
  notifyEmails: string;
}

export interface INotificationTemplate {
  id: string;
  code: string;
  subject: string;
  body: string;
  isActive?: boolean;
}

export interface INotificationTemplateRequest {
  code: string;
  subject: string;
  body: string;
  isActive?: boolean;
}

export interface INotificationTemplateListResponse {
  items: INotificationTemplate[];
  totalCount: number;
}

export interface INotificationTemplateKey {
  code: string;
  name: string;
  description: string;
}

export interface INotificationTemplateParam {
  key: string;
  description: string;
}

export interface MenuItem {
  id: string; 
  key?: string; 
  name: string;
  parentId: string | null;
  index: number;
  url: string;
  icon: string;
  isActive: boolean;
  children?: MenuItem[];
}

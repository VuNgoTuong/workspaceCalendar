import { baseAPI } from './baseAPI';

export interface IDelegationUserSummary {
  id: string;
  username: string;
  email: string;
  fullname: string;
  employeeCode: string;
  avatarUrl: string;
  phoneNumber: string;
  departmentId: string;
  departmentName: string;
  unitName: string;
  unitFullPathName: string;
  jobTitleName: string;
  positionName: string;
}

export interface IDelegation {
  id: string;
  leaderId: string;
  secretaryId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  leader: IDelegationUserSummary;
  secretary: IDelegationUserSummary;
}

export interface IDelegationListParams {
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  IsAscending?: boolean;
  search?: string;
}

export interface IDelegationListResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: IDelegation[];
}

export interface IDelegationRequest {
  secretaryId: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface IMyLeaderUserSummary {
  id: string;
  username: string;
  email: string;
  fullname: string;
  employeeCode: string;
  avatarUrl: string;
  phoneNumber: string;
  unitName: string;
  unitFullPathName: string;
  departmentId: string;
  departmentName: string;
  jobTitleName: string;
  positionName: string;
  roles: string[];
  restrictToDepartmentIds: { id: string; resourceId: string }[];
}

export interface IMyLeaderDelegation {
  id: string;
  leaderId: string;
  secretaryId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  leader: IMyLeaderUserSummary;
  secretary: IMyLeaderUserSummary;
}

let myLeaderPrefetch: Promise<IMyLeaderDelegation[]> | null = null;

export const delegationAPI = {
  getDelegations: (params?: IDelegationListParams): Promise<IDelegationListResponse> =>
    baseAPI.get<IDelegationListResponse>('/Delegations', { params }),

  getMySecretaryIds: (): Promise<IDelegation[]> =>
    baseAPI.get<IDelegation[]>('/Delegations/my-secretary-ids'),

  getMyLeader: (): Promise<IMyLeaderDelegation[]> =>
    baseAPI.get<IMyLeaderDelegation[]>('/Delegations/my-leader'),

  prefetchMyLeader: (): Promise<IMyLeaderDelegation[]> => {
    if (!myLeaderPrefetch) {
      myLeaderPrefetch = baseAPI
        .get<IMyLeaderDelegation[]>('/Delegations/my-leader')
        .catch((e) => {
          myLeaderPrefetch = null;
          throw e;
        });
    }
    return myLeaderPrefetch;
  },

  getMyLeaderCached: (): Promise<IMyLeaderDelegation[]> => delegationAPI.prefetchMyLeader(),

  clearMyLeaderCache: (): void => {
    myLeaderPrefetch = null;
  },

  getDelegationById: (id: string): Promise<IDelegation> =>
    baseAPI.get<IDelegation>(`/Delegations/${id}`),

  createDelegation: (data: IDelegationRequest): Promise<IDelegation> =>
    baseAPI.post<IDelegation>('/Delegations', data),

  updateDelegation: (id: string, data: IDelegationRequest): Promise<IDelegation> =>
    baseAPI.put<IDelegation>(`/Delegations/${id}`, data),

  deleteDelegation: (id: string): Promise<void> =>
    baseAPI.delete<void>(`/Delegations/${id}`),
};

export default delegationAPI;

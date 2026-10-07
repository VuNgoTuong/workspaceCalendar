import { baseAPI } from './baseAPI';

export interface IScheduleType {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface IScheduleTypeListParams {
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  IsAscending?: boolean;
  search?: string;
}

export interface IScheduleTypeListResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: IScheduleType[];
}

export interface IScheduleTypeRequest {
  name: string;
  code: string;
  isActive?: boolean;
}

export const scheduleTypeAPI = {
  getScheduleTypes: (params?: IScheduleTypeListParams): Promise<IScheduleTypeListResponse> =>
    baseAPI.get<IScheduleTypeListResponse>('/ScheduleTypes', { params }),

  getScheduleTypeById: (id: string): Promise<IScheduleType> =>
    baseAPI.get<IScheduleType>(`/ScheduleTypes/${id}`),

  createScheduleType: (data: IScheduleTypeRequest): Promise<IScheduleType> =>
    baseAPI.post<IScheduleType>('/ScheduleTypes', data),

  updateScheduleType: (id: string, data: IScheduleTypeRequest): Promise<IScheduleType> =>
    baseAPI.put<IScheduleType>(`/ScheduleTypes/${id}`, data),

  deleteScheduleType: (id: string): Promise<void> =>
    baseAPI.delete<void>(`/ScheduleTypes/${id}`),
};

export default scheduleTypeAPI;

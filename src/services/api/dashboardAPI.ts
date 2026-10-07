import { baseAPI } from './baseAPI';

export interface IDashboardOverviewParams {
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface IDashboardScheduleSummary {
  totalSchedules: number;
  todaySchedules: number;
  upcomingSchedules: number;
  completedSchedules: number;
  canceledSchedules: number;
}

export interface IDashboardOverviewByType<T> {
  personals: T;
  leaderRegistrations: T;
  invitations: T;
  leaderApprovals: T;
}

export interface IDashboardOverviewResponse {
  summary: IDashboardOverviewByType<IDashboardScheduleSummary> & { overall?: IDashboardScheduleSummary };
  percentages: IDashboardOverviewByType<number>;
}

export const dashboardAPI = {
  getOverview: (params?: IDashboardOverviewParams): Promise<IDashboardOverviewResponse> =>
    baseAPI.get<IDashboardOverviewResponse>('/Dashboard/overview', { params }),
};

export default dashboardAPI;

import { useState } from 'react';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { dashboardAPI } from '../../../services/api/dashboardAPI';
import { ScheduleOccurrenceStatus } from '../../../constants/scheduleOccurrenceStatus';
import { ScheduleInvitationFilterStatus } from '../../../constants/participationStatus';
import { useOverviewLeaderId } from '../../work-schedule/TongHop/hooks/useCalendarOverviewQuery';
import { APPROVALS_QUERY_KEY, useApprovalRequestsQuery } from '../../work-schedule/PheDuyetLich/hooks/useScheduleApprovalQueries';
import { INVITATIONS_QUERY_KEY, useInvitationsQuery } from '../../work-schedule/LichMoiThamDu/hooks/useInvitationQueries';
import { scheduleOccurrenceAPI } from '../../../services/api/scheduleOccurrenceAPI';
import { scheduleParticipantAPI } from '../../../services/api/scheduleParticipantAPI';
import { mapOccurrenceToApprovalRequest } from '../../work-schedule/PheDuyetLich/utils/occurrenceAdapter';
import { mapOccurrenceToInvitation } from '../../work-schedule/LichMoiThamDu/utils/occurrenceAdapter';
import type { IDashboardOverviewParams, IDashboardOverviewResponse } from '../../../services/api/dashboardAPI';

export const useDashboardOverviewQuery = (params: IDashboardOverviewParams, enabled = true) => {
  return useQuery<IDashboardOverviewResponse>({
    queryKey: ['dashboard-overview', params],
    queryFn: () => dashboardAPI.getOverview(params),
    enabled,
    placeholderData: keepPreviousData,
  });
};

const PENDING_PREVIEW_LIMIT = 5;

const ownApprovals = <T extends { leaderId?: string }>(items: T[] | undefined, viewerId: string | undefined) =>
  (items ?? []).filter((r) => !!viewerId && r.leaderId === viewerId);

export const usePendingActionsQuery = (canApprove: boolean) => {
  const leaderId = useOverviewLeaderId();
  const [fromIso] = useState(() => dayjs().startOf('day').toISOString());

  const approvals = useApprovalRequestsQuery(
    {
      leaderId,
      status: ScheduleOccurrenceStatus.Waiting,
      StartDate: fromIso,
      PageNumber: 1,
      PageSize: PENDING_PREVIEW_LIMIT,
      SortBy: 'StartDate',
      IsAscending: true,
    },
    { enabled: canApprove && !!leaderId }
  );

  const invitations = useInvitationsQuery(
    {
      participantId: leaderId,
      status: ScheduleInvitationFilterStatus.Waiting,
      StartDate: fromIso,
      PageNumber: 1,
      PageSize: PENDING_PREVIEW_LIMIT,
      SortBy: 'StartDate',
      IsAscending: true,
    },
    { enabled: !!leaderId }
  );

  const isError = invitations.isError || (canApprove && approvals.isError);
  const isReady = invitations.isSuccess && (!canApprove || approvals.isSuccess);
  const status: 'loading' | 'error' | 'ready' = isError ? 'error' : isReady ? 'ready' : 'loading';

  const ownItems = ownApprovals(approvals.data?.items, leaderId);
  const approvalsScoped = ownItems.length === (approvals.data?.items?.length ?? 0);

  return {
    approvalsPage: approvals.data ? { ...approvals.data, items: ownItems } : undefined,
    invitationsPage: invitations.data,
    approvalTotal: canApprove ? (approvalsScoped ? approvals.data?.totalCount ?? 0 : ownItems.length) : 0,
    invitationTotal: invitations.data?.total ?? 0,
    status,
    refetch: () => Promise.all([invitations.refetch(), canApprove ? approvals.refetch() : undefined]),
  };
};

const PENDING_PAGE_SIZE = 10;

export const useInfinitePendingActionsQuery = (canApprove: boolean, enabled: boolean) => {
  const leaderId = useOverviewLeaderId();
  const [fromIso] = useState(() => dayjs().startOf('day').toISOString());
  const base = { StartDate: fromIso, PageSize: PENDING_PAGE_SIZE, SortBy: 'StartDate', IsAscending: true };
  const nextPage = <T extends { items: unknown[]; total: number }>(lastPage: T, pages: T[]) =>
    pages.reduce((n, p) => n + p.items.length, 0) < lastPage.total ? pages.length + 1 : undefined;

  const approvals = useInfiniteQuery({
    queryKey: [...APPROVALS_QUERY_KEY, 'dashboard-infinite', { leaderId, ...base }],
    enabled: enabled && canApprove && !!leaderId,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await scheduleOccurrenceAPI.getScheduleApprovals({
        ...base,
        leaderId,
        status: ScheduleOccurrenceStatus.Waiting,
        PageNumber: pageParam,
      });
      return { items: (res.items || []).map(mapOccurrenceToApprovalRequest), total: res.totalCount };
    },
    getNextPageParam: nextPage,
  });

  const invitations = useInfiniteQuery({
    queryKey: [...INVITATIONS_QUERY_KEY, 'dashboard-infinite', { leaderId, ...base }],
    enabled: enabled && !!leaderId,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await scheduleParticipantAPI.getScheduleParticipants({
        ...base,
        participantId: leaderId,
        status: ScheduleInvitationFilterStatus.Waiting,
        PageNumber: pageParam,
      });
      return { items: (res.items || []).map((dto) => mapOccurrenceToInvitation(dto, leaderId)), total: res.totalCount };
    },
    getNextPageParam: nextPage,
  });

  const allLoaded = approvals.data?.pages.flatMap((p) => p.items) ?? [];
  const ownLoaded = ownApprovals(allLoaded, leaderId);
  const isError = invitations.isError || (canApprove && approvals.isError);
  const isReady = invitations.isSuccess && (!canApprove || approvals.isSuccess);
  const status: 'loading' | 'error' | 'ready' = isError ? 'error' : isReady ? 'ready' : 'loading';

  return {
    approvals: {
      items: canApprove ? ownLoaded : [],
      total: !canApprove ? 0 : ownLoaded.length === allLoaded.length ? approvals.data?.pages[0]?.total ?? 0 : ownLoaded.length,
      hasNextPage: canApprove && approvals.hasNextPage,
      isFetchingNextPage: approvals.isFetchingNextPage,
      fetchNextPage: approvals.fetchNextPage,
    },
    invitations: {
      items: invitations.data?.pages.flatMap((p) => p.items) ?? [],
      total: invitations.data?.pages[0]?.total ?? 0,
      hasNextPage: invitations.hasNextPage,
      isFetchingNextPage: invitations.isFetchingNextPage,
      fetchNextPage: invitations.fetchNextPage,
    },
    status,
    refetch: () => Promise.all([invitations.refetch(), canApprove ? approvals.refetch() : undefined]),
  };
};

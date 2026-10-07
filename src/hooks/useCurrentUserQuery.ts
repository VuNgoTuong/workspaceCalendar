import { useQuery } from '@tanstack/react-query';
import { userAPI } from '../services/api/userAPI';
import { queryClient } from '../services/api/queryClient';

export const CURRENT_USER_QUERY_KEY = ['current-user'];
const STALE_TIME = 5 * 60 * 1000;

export const fetchCurrentUser = () =>
  queryClient.fetchQuery<any>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => userAPI.getCurrentUser(),
    staleTime: STALE_TIME,
  });

export const useCurrentUserQuery = () =>
  useQuery<any>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => userAPI.getCurrentUser(),
    staleTime: STALE_TIME,
  });

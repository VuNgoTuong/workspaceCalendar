import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { delegationAPI } from '../../../../services/api/delegationAPI';
import type {
  IDelegation,
  IDelegationListParams,
  IDelegationListResponse,
  IDelegationRequest,
} from '../../../../services/api/delegationAPI';

const QUERY_KEY = 'delegations';

export const useDelegationsQuery = (params?: IDelegationListParams) => {
  return useQuery<IDelegationListResponse>({
    queryKey: [QUERY_KEY, params],
    queryFn: () => delegationAPI.getDelegations(params),
    placeholderData: keepPreviousData,
  });
};

export const useMySecretaryIdsQuery = (enabled = true) => {
  return useQuery<IDelegation[]>({
    queryKey: [QUERY_KEY, 'my-secretary-ids'],
    queryFn: () => delegationAPI.getMySecretaryIds(),
    enabled,
  });
};

export const useCreateDelegationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IDelegationRequest) => delegationAPI.createDelegation(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
};

export const useUpdateDelegationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IDelegationRequest }) =>
      delegationAPI.updateDelegation(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
};

export const useDeleteDelegationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => delegationAPI.deleteDelegation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
};

export type { IDelegation };

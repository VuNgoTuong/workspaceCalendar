import { toast } from '../../store/toastStore';
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { getApiErrorMessage } from '../../utils/helpers';
import i18n from '../../i18n';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) return;

      const errMsg = getApiErrorMessage(error, i18n.t('common.query_error_default'));
      toast.error(errMsg || i18n.t('common.query_error_default'));
    },
  }),

  mutationCache: new MutationCache({
    onError: (error: any, _variables: any, _context: any, mutation: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) return;

      if (mutation.options?.onError || mutation.meta?.showGlobalError === false) return;

      const errMsg = getApiErrorMessage(error, i18n.t('common.mutation_error_default'));
      toast.error(errMsg || i18n.t('common.mutation_error_default'));
    },
  }),

  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, 
      retry: (failureCount, error: any) => {
        if (failureCount >= 2) return false;
        
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) {
          return false; 
        }
        return true;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export default queryClient;

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userAPI, type IExecutiveUser } from '../../../../services/api/userAPI';
import type { EventColorKey } from '../../TongHop/calendarTheme';

const EVENT_COLOR_KEYS: EventColorKey[] = ['blue', 'green', 'rose', 'amber', 'violet', 'teal'];

export const colorForExecutive = (id: string): EventColorKey => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return EVENT_COLOR_KEYS[Math.abs(hash) % EVENT_COLOR_KEYS.length];
};

export const useExecutiveDirectory = () => {
  const query = useQuery<IExecutiveUser[]>({
    queryKey: ['executive-directory'],
    queryFn: async () => {
      const res = await userAPI.getExecutiveManagement({ PageSize: 100 });
      return res.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const byId = useMemo(() => {
    const map = new Map<string, IExecutiveUser>();
    (query.data ?? []).forEach((e) => map.set(e.id, e));
    return map;
  }, [query.data]);

  return { ...query, byId };
};

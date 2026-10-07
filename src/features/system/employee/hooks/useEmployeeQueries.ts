import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Employee } from '../../types';
import { userAPI } from '../../../../services/api/userAPI';
import { authAPI } from '../../../../services/api/authAPI';
import { permissionAPI } from '../../../../services/api/permissionAPI';
import type {
  IPermissionsMetadata,
  IPermissionDefinition,
} from '../../../../types/permissionTypes';

export const useEmployeeDetailQuery = (id: string | null | undefined) => {
  return useQuery<Employee>({
    queryKey: ['user-detail', id],
    queryFn: () => userAPI.getUserById(id as string),
    enabled: !!id,
  });
};

export const useEmployeesQuery = (params?: {
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  IsAscending?: boolean;
  searchKeyword?: string;
  RoleId?: string;
  departmentId?: string;
  UnitName?: string;
  Title?: string;
}) => {
  return useQuery<{ items: Employee[]; totalCount: number }>({
    queryKey: ['employees', params],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await userAPI.getUsers(params);
      return {
        items: response.items || [],
        totalCount: response.totalCount || 0,
      };
    },
  });
};

export const useRolesQuery = () => {
  return useQuery<any[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      return await permissionAPI.getRoles();
    },
  });
};

export const useUpdateEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
      roleIds,
    }: {
      id: string;
      data: { username: string; email: string };
      roleIds: string[];
    }) => {
      await Promise.all([
        userAPI.updateUser(id, data),
        userAPI.updateUserRoles(id, roleIds),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

export const useUpdateUserRolesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      return await userAPI.updateUserRoles(userId, roleIds);
    },
    onMutate: async ({ userId, roleIds }) => {
      await queryClient.cancelQueries({ queryKey: ['employees'] });
      const previousQueries = queryClient.getQueriesData<{ items: Employee[]; totalCount: number }>({ queryKey: ['employees'] });

      const rolesList = queryClient.getQueryData<any[]>(['roles']) || [];
      const roleNames = roleIds
        .map((id) => rolesList.find((r) => r.id === id)?.name)
        .filter((name): name is string => Boolean(name));

      queryClient.setQueriesData<{ items: Employee[]; totalCount: number }>(
        { queryKey: ['employees'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((emp) =>
              emp.id === userId ? { ...emp, roles: roleNames } : emp
            ),
          };
        }
      );

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      context?.previousQueries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

const PERMISSION_META_STALE_TIME = 5 * 60 * 1000;

export const usePermissionMetadataQuery = () => {
  return useQuery<IPermissionsMetadata>({
    queryKey: ['permission-metadata'],
    queryFn: () => permissionAPI.getMetadata(),
    staleTime: PERMISSION_META_STALE_TIME,
  });
};

export const usePermissionDefinitionsQuery = () => {
  return useQuery<IPermissionDefinition[]>({
    queryKey: ['permission-definitions'],
    queryFn: () => permissionAPI.getDefinitions(),
    staleTime: PERMISSION_META_STALE_TIME,
  });
};

export interface DeptPermState {
  assigned: boolean;
  id?: string;
}

const normalizeId = (id: string) => id.toLowerCase();

const cloneMap = (map: Record<string, DeptPermState>) =>
  JSON.parse(JSON.stringify(map)) as Record<string, DeptPermState>;

export const useEmployeeDepartmentPermissions = (
  userId: string | null | undefined,
  departmentResourceType: number | undefined,
  userGranteeType: number | undefined,
  permissionMask: number,
) => {
  const [deptPermMap, setDeptPermMap] = useState<Record<string, DeptPermState>>({});
  const [initialDeptPermMap, setInitialDeptPermMap] = useState<Record<string, DeptPermState>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPermissions = useCallback(async () => {
    if (!userId || userGranteeType === undefined) {
      setDeptPermMap({});
      setInitialDeptPermMap({});
      return;
    }
    setLoading(true);
    try {
      const response = await permissionAPI.getGranteeDepartmentPermissions(userId, userGranteeType);
      const map: Record<string, DeptPermState> = {};
      (response?.grants ?? []).forEach((g) => {
        if (!g.resourceId || !(Number(g.permissions) > 0)) return;
        map[normalizeId(String(g.resourceId))] = {
          assigned: true,
          id: g.id ? String(g.id) : undefined,
        };
      });
      setDeptPermMap(map);
      setInitialDeptPermMap(cloneMap(map));
    } finally {
      setLoading(false);
    }
  }, [userId, userGranteeType]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const handleToggleAssigned = useCallback((departmentId: string, assigned: boolean) => {
    const key = normalizeId(departmentId);
    setDeptPermMap((prev) => {
      if (!assigned) {
        const existing = prev[key];
        if (!existing?.id) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: { assigned: false, id: existing.id } };
      }
      return {
        ...prev,
        [key]: { assigned: true, id: prev[key]?.id },
      };
    });
  }, []);

  const hasChanges = useMemo(() => {
    const allIds = new Set([...Object.keys(deptPermMap), ...Object.keys(initialDeptPermMap)]);
    return Array.from(allIds).some((id) => {
      const cur = deptPermMap[id]?.assigned ?? false;
      const init = initialDeptPermMap[id]?.assigned ?? false;
      return cur !== init;
    });
  }, [deptPermMap, initialDeptPermMap]);

  const handleCancel = useCallback(() => {
    setDeptPermMap(cloneMap(initialDeptPermMap));
  }, [initialDeptPermMap]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!userId || departmentResourceType === undefined || userGranteeType === undefined || !hasChanges || saving) {
      return false;
    }
    if (!permissionMask) {
      throw new Error('Permission definitions are not ready');
    }

    setSaving(true);
    try {
      const allIds = new Set([...Object.keys(deptPermMap), ...Object.keys(initialDeptPermMap)]);
      const tasks: Promise<unknown>[] = [];

      allIds.forEach((departmentId) => {
        const curAssigned = deptPermMap[departmentId]?.assigned ?? false;
        const initAssigned = initialDeptPermMap[departmentId]?.assigned ?? false;
        if (curAssigned === initAssigned) return;

        const initId = initialDeptPermMap[departmentId]?.id ?? deptPermMap[departmentId]?.id;

        if (!curAssigned) {
          if (initId) tasks.push(permissionAPI.deletePermission(initId));
          return;
        }

        tasks.push(
          permissionAPI.createPermission({
            resourceType: departmentResourceType,
            resourceId: departmentId,
            granteeType: userGranteeType,
            granteeId: userId,
            permissions: permissionMask,
            isDeny: false,
            recursive: true,
          })
        );
      });

      await Promise.all(tasks);
      await loadPermissions();
      return true;
    } finally {
      setSaving(false);
    }
  }, [
    userId,
    departmentResourceType,
    userGranteeType,
    deptPermMap,
    initialDeptPermMap,
    hasChanges,
    saving,
    permissionMask,
    loadPermissions,
  ]);

  return {
    deptPermMap,
    initialDeptPermMap,
    loading,
    saving,
    hasChanges,
    handleToggleAssigned,
    handleCancel,
    handleSave,
  };
};

export const useDeleteEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await userAPI.deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: async (userId: string) => {
      return await authAPI.resetPassword(userId);
    },
  });
};

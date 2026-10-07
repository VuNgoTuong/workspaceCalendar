import { toast } from '../../../../store/toastStore';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import permissionAPI from '../../../../services/api/permissionAPI';
import type { IPermission } from '../../../../types/permissionTypes';
import {
  usePermissionMetadataQuery,
  usePermissionDefinitionsQuery,
  useRolesQuery,
} from '../../employee/hooks/useEmployeeQueries';

export interface RoleItem {
  id: string;
  name: string;
  description?: string;
}

export type PermissionTab = 'function' | 'department' | 'menu';

export interface DeptPermState {
  assigned: boolean;
  recursive: boolean;
  id?: string;
}

const DEFAULT_DEPT_PERM: DeptPermState = { assigned: false, recursive: false };

const popcount = (n: number) => {
  let count = 0;
  let x = n;
  while (x) {
    count += x & 1;
    x >>= 1;
  }
  return count;
};

export const usePermission = () => {
  const { t } = useTranslation();
  const { data: metadata = null, isLoading: metaMetadataLoading } = usePermissionMetadataQuery();
  const { data: definitions = [], isLoading: metaDefinitionsLoading } = usePermissionDefinitionsQuery();
  const metaLoading = metaMetadataLoading || metaDefinitionsLoading;

  const { data: roles = [], isLoading: rolesLoading } = useRolesQuery() as { data: RoleItem[] | undefined; isLoading: boolean };
  const [roleGrantedCounts, setRoleGrantedCounts] = useState<Record<string, number>>({});

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PermissionTab>('function');

  const [matrix, setMatrix] = useState<Record<number, number>>({});
  const [initialMatrix, setInitialMatrix] = useState<Record<number, number>>({});
  const [matrixIds, setMatrixIds] = useState<Record<number, string>>({});

  const [deptPermMap, setDeptPermMap] = useState<Record<string, DeptPermState>>({});
  const [initialDeptPermMap, setInitialDeptPermMap] = useState<Record<string, DeptPermState>>({});

  const [menuPermMap, setMenuPermMap] = useState<Record<string, DeptPermState>>({});
  const [initialMenuPermMap, setInitialMenuPermMap] = useState<Record<string, DeptPermState>>({});

  const [matrixLoading, setMatrixLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const departmentResourceType = useMemo(
    () => metadata?.resourceTypes.find((rt) => rt.name.toLowerCase() === 'department')?.value,
    [metadata]
  );

  const menuResourceType = useMemo(
    () => metadata?.resourceTypes.find((rt) => rt.name.toLowerCase() === 'menu')?.value,
    [metadata]
  );

  useEffect(() => {
    if (roles.length === 0) return;
    let cancelled = false;
    const loadCounts = async () => {
      try {
        const response = await permissionAPI.getPermissions({ granteeType: 2, pageSize: 20000 });
        const counts: Record<string, number> = {};
        (response.items as IPermission[]).forEach((p) => {
          if (p.resourceId) return;
          counts[p.granteeId] = (counts[p.granteeId] || 0) + popcount(p.permissions);
        });
        if (!cancelled) setRoleGrantedCounts(counts);
      } catch {
      }
    };
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [roles]);

  const loadRoleMatrix = useCallback(async (roleId: string) => {
    setMatrixLoading(true);
    try {
      const response = await permissionAPI.getPermissions({
        granteeType: 2,
        granteeId: roleId,
        pageSize: 20000,
      });

      const newMatrix: Record<number, number> = {};
      const newMatrixIds: Record<number, string> = {};
      const newDeptMap: Record<string, DeptPermState> = {};
      const newMenuMap: Record<string, DeptPermState> = {};
      (response.items as IPermission[]).forEach((p) => {
        if (p.granteeId !== roleId) return;
        if (!p.resourceId) {
          newMatrix[p.resourceType] = p.permissions;
          newMatrixIds[p.resourceType] = p.id;
        } else if (p.resourceType === departmentResourceType) {
          newDeptMap[p.resourceId] = { assigned: p.permissions > 0, recursive: !!p.recursive, id: p.id };
        } else if (p.resourceType === menuResourceType) {
          newMenuMap[p.resourceId] = { assigned: p.permissions > 0, recursive: !!p.recursive, id: p.id };
        }
      });
      setMatrix(newMatrix);
      setInitialMatrix(JSON.parse(JSON.stringify(newMatrix)));
      setMatrixIds(newMatrixIds);
      setDeptPermMap(newDeptMap);
      setInitialDeptPermMap(JSON.parse(JSON.stringify(newDeptMap)));
      setMenuPermMap(newMenuMap);
      setInitialMenuPermMap(JSON.parse(JSON.stringify(newMenuMap)));
    } catch {
      toast.error(t('permission.toast_load_matrix_error'));
    } finally {
      setMatrixLoading(false);
    }
  }, [t, departmentResourceType, menuResourceType]);

  useEffect(() => {
    if (selectedRoleId) {
      setMatrix({});
      setDeptPermMap({});
      setMenuPermMap({});
      loadRoleMatrix(selectedRoleId);
    } else {
      setMatrix({});
      setInitialMatrix({});
      setMatrixIds({});
      setDeptPermMap({});
      setInitialDeptPermMap({});
      setMenuPermMap({});
      setInitialMenuPermMap({});
    }
  }, [selectedRoleId, loadRoleMatrix]);

  const handleToggle = useCallback((resourceType: number, defValue: number) => {
    setMatrix((prev) => {
      const currentVal = prev[resourceType] || 0;
      const isChecked = (currentVal & defValue) === defValue;
      const newVal = isChecked ? (currentVal & ~defValue) : (currentVal | defValue);
      return { ...prev, [resourceType]: newVal };
    });
  }, []);

  const handleToggleRow = useCallback((resourceType: number, newMask: number) => {
    setMatrix((prev) => ({ ...prev, [resourceType]: newMask }));
  }, []);

  const handleToggleDeptAssigned = useCallback((departmentId: string, assigned: boolean) => {
    setDeptPermMap((prev) => ({
      ...prev,
      [departmentId]: {
        assigned,
        recursive: assigned,
        id: prev[departmentId]?.id,
      },
    }));
  }, []);

  const handleToggleMenuAssigned = useCallback((menuItem: { id: string; children?: any[] }, assigned: boolean) => {
    setMenuPermMap((prev) => {
      const next = { ...prev };
      
      const updateMenuAndChildren = (item: { id: string; children?: any[] }) => {
        next[item.id] = {
          assigned,
          recursive: assigned ? (next[item.id]?.recursive ?? false) : false,
          id: next[item.id]?.id,
        };

        if (Array.isArray(item.children)) {
          item.children.forEach(updateMenuAndChildren);
        }
      };

      updateMenuAndChildren(menuItem);
      return next;
    });
  }, []);

  const handleToggleMenuRecursive = useCallback((menuId: string, recursive: boolean) => {
    setMenuPermMap((prev) => ({
      ...prev,
      [menuId]: { assigned: prev[menuId]?.assigned ?? false, recursive, id: prev[menuId]?.id },
    }));
  }, []);

  const handleCancel = useCallback(() => {
    setMatrix(JSON.parse(JSON.stringify(initialMatrix)));
    setDeptPermMap(JSON.parse(JSON.stringify(initialDeptPermMap)));
    setMenuPermMap(JSON.parse(JSON.stringify(initialMenuPermMap)));
  }, [initialMatrix, initialDeptPermMap, initialMenuPermMap]);

  const handleSelectAll = useCallback(() => {
    const allMask = definitions.reduce((acc, def) => acc | def.value, 0);
    const newMatrix: Record<number, number> = {};
    metadata?.resourceTypes.forEach((rt) => {
      newMatrix[rt.value] = allMask;
    });
    setMatrix(newMatrix);
  }, [definitions, metadata]);

  const treePermMapChanged = (
    current: Record<string, DeptPermState>,
    initial: Record<string, DeptPermState>
  ) => {
    const allIds = new Set([...Object.keys(current), ...Object.keys(initial)]);
    return Array.from(allIds).some((id) => {
      const cur = current[id] ?? DEFAULT_DEPT_PERM;
      const init = initial[id] ?? DEFAULT_DEPT_PERM;
      return cur.assigned !== init.assigned || cur.recursive !== init.recursive;
    });
  };

  const hasChanges = useMemo(() => {
    const allKeys = new Set([
      ...Object.keys(matrix).map(Number),
      ...Object.keys(initialMatrix).map(Number),
    ]);
    const matrixChanged = Array.from(allKeys).some(
      (rt) => (matrix[rt] || 0) !== (initialMatrix[rt] || 0)
    );
    if (matrixChanged) return true;

    if (treePermMapChanged(deptPermMap, initialDeptPermMap)) return true;
    return treePermMapChanged(menuPermMap, initialMenuPermMap);
  }, [matrix, initialMatrix, deptPermMap, initialDeptPermMap, menuPermMap, initialMenuPermMap]);

  const handleSave = useCallback(async () => {
    if (!selectedRoleId || !hasChanges || saving) return;
    setSaving(true);
    try {
      const allKeys = new Set([
        ...Object.keys(matrix).map(Number),
        ...Object.keys(initialMatrix).map(Number),
      ]);
      const allMask = definitions.reduce((acc, def) => acc | def.value, 0);
      const promises: Promise<void>[] = [];
      Array.from(allKeys)
        .filter((rt) => (matrix[rt] || 0) !== (initialMatrix[rt] || 0))
        .forEach((rt) => {
          const newValue = matrix[rt] || 0;
          const existingId = matrixIds[rt];

          if (newValue === 0) {
            if (existingId) promises.push(permissionAPI.deletePermission(existingId));
            return;
          }

          promises.push(
            permissionAPI.createPermission({
              granteeType: 2,
              granteeId: selectedRoleId,
              resourceType: rt,
              permissions: newValue,
              isDeny: false,
            })
          );
        });

      if (departmentResourceType !== undefined) {
        const allDeptIds = new Set([
          ...Object.keys(deptPermMap),
          ...Object.keys(initialDeptPermMap),
        ]);
        allDeptIds.forEach((departmentId) => {
          const cur = deptPermMap[departmentId] ?? DEFAULT_DEPT_PERM;
          const initial = initialDeptPermMap[departmentId] ?? DEFAULT_DEPT_PERM;
          if (cur.assigned === initial.assigned && cur.recursive === initial.recursive) return;

          if (!cur.assigned && initial.id) {
            promises.push(permissionAPI.deletePermission(initial.id));
            return;
          }

          promises.push(
            permissionAPI.createPermission({
              granteeType: 2,
              granteeId: selectedRoleId,
              resourceType: departmentResourceType,
              resourceId: departmentId,
              permissions: cur.assigned ? allMask : 0,
              isDeny: false,
              recursive: true,
            })
          );
        });
      }

      if (menuResourceType !== undefined) {
        const allMenuIds = new Set([
          ...Object.keys(menuPermMap),
          ...Object.keys(initialMenuPermMap),
        ]);
        allMenuIds.forEach((menuId) => {
          const cur = menuPermMap[menuId] ?? DEFAULT_DEPT_PERM;
          const initial = initialMenuPermMap[menuId] ?? DEFAULT_DEPT_PERM;
          if (cur.assigned === initial.assigned && cur.recursive === initial.recursive) return;

          if (!cur.assigned && initial.id) {
            promises.push(permissionAPI.deletePermission(initial.id));
            return;
          }

          promises.push(
            permissionAPI.createPermission({
              granteeType: 2,
              granteeId: selectedRoleId,
              resourceType: menuResourceType,
              resourceId: menuId,
              permissions: cur.assigned ? allMask : 0,
              isDeny: false,
              recursive: cur.recursive,
            })
          );
        });
      }

      await Promise.all(promises);
      toast.success(t('permission.toast_save_success'));
      await loadRoleMatrix(selectedRoleId);
    } catch {
      toast.error(t('permission.toast_save_error'));
    } finally {
      setSaving(false);
    }
  }, [
    selectedRoleId, hasChanges, saving, matrix, initialMatrix, matrixIds,
    deptPermMap, initialDeptPermMap, departmentResourceType,
    menuPermMap, initialMenuPermMap, menuResourceType,
    definitions, t, loadRoleMatrix,
  ]);

  return {
    metadata,
    definitions,
    metaLoading,
    roles,
    rolesLoading,
    roleGrantedCounts,
    selectedRoleId,
    setSelectedRoleId,
    activeTab,
    setActiveTab,
    departmentResourceType,
    deptPermMap,
    initialDeptPermMap,
    handleToggleDeptAssigned,
    menuResourceType,
    menuPermMap,
    handleToggleMenuAssigned,
    handleToggleMenuRecursive,
    matrix,
    matrixLoading,
    hasChanges,
    saving,
    handleToggle,
    handleToggleRow,
    handleSave,
    handleCancel,
    handleSelectAll,
  };
};

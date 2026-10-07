import { useCallback, useState } from 'react';

interface DeptPermLike {
  assigned: boolean;
  recursive?: boolean;
  id?: string;
}

interface DeptRecordLike {
  id: string;
  parentId: string | null;
}

const normalizeId = (id: string) => id.toLowerCase();

export const useDeptPermissionCascade = (
  deptPermMap: Record<string, DeptPermLike>,
  initialDeptPermMap: Record<string, DeptPermLike>
) => {
  const [parentMap, setParentMap] = useState<Record<string, string | null>>({});

  const registerRecords = useCallback((records: DeptRecordLike[]) => {
    if (!records.length) return;
    setParentMap((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const r of records) {
        const id = normalizeId(r.id);
        const parentId = r.parentId != null ? normalizeId(String(r.parentId)) : null;
        if (next[id] !== parentId) {
          next[id] = parentId;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const registerChildren = useCallback(
    (_parentKey: string | number, children: DeptRecordLike[]) => registerRecords(children),
    [registerRecords]
  );

  const isDirty = useCallback(
    (id: string) => {
      const key = normalizeId(id);
      const cur = deptPermMap[key];
      const init = initialDeptPermMap[key];
      return (cur?.assigned ?? false) !== (init?.assigned ?? false);
    },
    [deptPermMap, initialDeptPermMap]
  );

  const getState = useCallback(
    (id: string): { checked: boolean; locked: boolean } => {
      const key = normalizeId(id);
      const own = deptPermMap[key];
      if (own) return { checked: !!own.assigned, locked: false };

      const visited = new Set<string>();
      let cur = parentMap[key] ?? null;
      while (cur && !visited.has(cur)) {
        visited.add(cur);
        const entry = deptPermMap[cur];
        if (entry) {
          // Preview only while parent change is unsaved
          if (entry.assigned && isDirty(cur)) return { checked: true, locked: true };
          return { checked: false, locked: false };
        }
        cur = parentMap[cur] ?? null;
      }
      return { checked: false, locked: false };
    },
    [deptPermMap, parentMap, isDirty]
  );

  return { registerRecords, registerChildren, getState };
};

export default useDeptPermissionCascade;

import React from 'react';
import { TreeSelect } from '../ui/TreeSelect';
import { queryClient } from '../../services/api/queryClient';
import { departmentAPI } from '../../services/api/departmentAPI';
import type { IDepartment } from '../../services/api/departmentAPI';

const DEPARTMENT_STALE_TIME = 5 * 60 * 1000;

const fetchDepartmentById = (id: string) =>
  queryClient.fetchQuery({
    queryKey: ['department', id],
    queryFn: () => departmentAPI.getDepartmentById(id),
    staleTime: DEPARTMENT_STALE_TIME,
  });

interface DepartmentTreeSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelectRecord?: (department: IDepartment) => void;
  displayLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  pill?: boolean;
  allowClear?: boolean;
  onClear?: () => void;
  className?: string;
  maxHeight?: number;
  popupMinWidth?: number;
}

const loadChildren = (parentId: string | number | null): Promise<IDepartment[]> =>
  queryClient.fetchQuery({
    queryKey: parentId === null ? ['departments', 'root', 'accessible'] : ['departments', 'children', 'accessible', String(parentId)],
    queryFn: () => departmentAPI.getAccessibleDepartments(
      parentId === null ? undefined : { parentId: String(parentId) }
    ),
    staleTime: DEPARTMENT_STALE_TIME,
  });

const resolveDepartmentPath = async (value: string | number): Promise<(string | number)[]> => {
  const path: (string | number)[] = [];
  const visited = new Set<string>();
  let current = await fetchDepartmentById(String(value)).catch(() => null);
  let parentId = current?.parentId ?? null;
  while (parentId) {
    if (visited.has(parentId)) break;
    visited.add(parentId);
    path.unshift(parentId);
    current = await fetchDepartmentById(parentId).catch(() => null);
    parentId = current?.parentId ?? null;
  }
  return path;
};

export const fetchDepartmentPathLabel = async (value: string | number): Promise<string> => {
  const department = await departmentAPI.getDepartmentById(String(value)).catch(() => null);
  return department?.departmentConfig?.fullPathName || department?.name || '';
};

export const DepartmentTreeSelect: React.FC<DepartmentTreeSelectProps> = ({
  value,
  onChange,
  onSelectRecord,
  displayLabel,
  placeholder,
  disabled,
  readOnly,
  pill,
  allowClear,
  onClear,
  className,
  maxHeight,
  popupMinWidth,
}) => (
  <TreeSelect<IDepartment>
    value={value}
    onChange={(val, record) => {
      onChange?.(String(val));
      onSelectRecord?.(record);
    }}
    loadChildren={loadChildren}
    getLabel={(d) => d.name}
    getSecondary={(d) => (d.code ? `(${d.code})` : undefined)}
    getSelectedLabel={(d) => d.departmentConfig?.fullPathName || d.name}
    getValue={(d) => d.id}
    resolvePath={resolveDepartmentPath}
    displayLabel={displayLabel}
    placeholder={placeholder}
    disabled={disabled}
    readOnly={readOnly}
    pill={pill}
    allowClear={allowClear}
    onClear={onClear}
    className={className}
    maxHeight={maxHeight}
    popupMinWidth={popupMinWidth}
  />
);

export default DepartmentTreeSelect;

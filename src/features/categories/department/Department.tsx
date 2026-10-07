import { toast } from '../../../store/toastStore';
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Input } from 'antd';
import { Search, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { TreeTable } from '../../../components/ui/TreeTable';
import type { TreeTableColumn, TreeTableHandle } from '../../../components/ui/TreeTable';
import { Switch } from '../../../components/ui/Switch';
import {
  useDepartmentsQuery,
  useUpdateDepartmentMutation,
  fetchDepartmentChildren,
} from './hooks/useDepartmentQueries';
import type { IDepartment } from '../../../services/api/departmentAPI';
import { getApiErrorMessage } from '../../../utils/helpers';

const EMPTY_DEPARTMENTS: IDepartment[] = [];

export const DepartmentCategory: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const departmentsParams = useMemo(() => ({
    PageNumber: currentPage,
    PageSize: pageSize,
    search: search || undefined,
    ...(search ? {} : { level: 1 }),
  }), [currentPage, pageSize, search]);
  const { data, isLoading, isFetching } = useDepartmentsQuery(departmentsParams);
  const updateMutation = useUpdateDepartmentMutation();
  const pendingId = updateMutation.isPending ? updateMutation.variables?.id : undefined;
  const treeTableRef = useRef<TreeTableHandle<IDepartment>>(null);

  const reloadTree = useCallback(async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['departments'] }),
      treeTableRef.current?.reloadExpandedNodes() ?? Promise.resolve(),
    ]);
  }, [queryClient]);

  const columns: TreeTableColumn<IDepartment>[] = useMemo(() => [
    {
      key: 'name',
      title: t('department.name_col'),
      isTreeColumn: true,
      render: (_v, record) => (
        <div>
          <div className="text-13.5 font-medium text-slate-800 dark:text-slate-100">
            {record.name}
          </div>
          <div className="mt-0.5 text-11.5 font-medium tracking-tight text-slate-500 dark:text-slate-500">
            {record.code}
          </div>
        </div>
      ),
    },
    {
      key: 'level',
      title: t('department.level_col'),
      width: 90,
      align: 'center',
      render: (_v, record) => (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
          {record.level}
        </span>
      ),
    },
    {
      key: 'requireApproval',
      title: t('department.require_approval_col'),
      width: 230,
      align: 'center',
      render: (_v, record) => (
        <Switch
          checked={!!record.departmentConfig?.requireApproval}
          loading={pendingId === record.id}
          onChange={(checked) => {
            updateMutation.mutate(
              { id: record.id, data: { requireApproval: checked } },
              {
                onSuccess: async () => {
                  await reloadTree();
                  toast.success(t(checked ? 'department.toast_require_approval_on' : 'department.toast_require_approval_off', { name: record.name }));
                },
                onError: (err: any) => toast.error(t('department.toast_error', { error: getApiErrorMessage(err) || t('department.update_error_default') })),
              }
            );
          }}
        />
      ),
    },
    {
      key: 'isActive',
      title: t('department.active_col'),
      width: 140,
      align: 'center',
      render: (_v, record) => (
        <Switch
          checked={!!record.isActive}
          loading={pendingId === record.id}
          onChange={(checked) => {
            updateMutation.mutate(
              { id: record.id, data: { isActive: checked } },
              {
                onSuccess: async () => {
                  await reloadTree();
                  toast.success(t(checked ? 'department.toast_active_on' : 'department.toast_active_off', { name: record.name }));
                },
                onError: (err: any) => toast.error(t('department.toast_error', { error: getApiErrorMessage(err) || t('department.update_error_default') })),
              }
            );
          }}
        />
      ),
    },
  ], [t, pendingId, reloadTree]);

  const loadChildren = useCallback(
    (parentId: string | number, _record: IDepartment, page: number) => fetchDepartmentChildren(parentId, page),
    []
  );

  const pagination = useMemo(() => ({
    current: currentPage,
    pageSize,
    total: data?.totalCount || 0,
    onChange: (page: number, size: number) => {
      if (size !== pageSize) {
        setPageSize(size);
        setCurrentPage(1);
      } else {
        setCurrentPage(page);
      }
    },
  }), [currentPage, pageSize, data?.totalCount]);

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 shadow-[0_2px_12px_-6px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-2.5 lg:pr-5 lg:border-r lg:border-slate-100 dark:lg:border-slate-800 shrink-0">
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            <Building2 size={20} className="text-[#00529C] dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight whitespace-nowrap">
              {t('department.title')}
            </h2>
            <p className="text-11.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {t('department.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-1 min-w-0">
          <div className="relative w-full max-w-4xl">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
              {t('department.search_label')}
            </span>
            <Input
              placeholder={t('department.search_placeholder')}
              prefix={<Search size={16} className="text-slate-400 mr-1" />}
              value={searchInput}
              onChange={(e) => {
                const val = e.target.value;
                setSearchInput(val);
                if (val === '') {
                  setSearch('');
                  setCurrentPage(1);
                }
              }}
              onPressEnter={() => {
                setSearch(searchInput.trim());
                setCurrentPage(1);
              }}
              allowClear
              className="premium-input"
            />
          </div>
        </div>
      </div>

      <TreeTable<IDepartment>
        ref={treeTableRef}
        columns={columns}
        dataSource={data?.items ?? EMPTY_DEPARTMENTS}
        rowKey="id"
        loading={isLoading}
        refreshing={isFetching && !isLoading}
        loadChildren={loadChildren}
        pagination={pagination}
      />
    </div>
  );
};

export default DepartmentCategory;

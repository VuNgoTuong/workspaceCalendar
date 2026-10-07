import { toast } from '../../../store/toastStore';
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Table, Input, Spin, Modal, Select } from 'antd';
import { Search, Mail, Phone, ChevronDown, Users, X, KeyRound, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { ActionButton } from '../../../components/ui';
import { Select as RoleSelect } from '../../../components/ui/Select';
import {
  useEmployeesQuery,
  useRolesQuery,
  useUpdateEmployeeMutation,
  useUpdateUserRolesMutation,
  useDeleteEmployeeMutation,
  useResetPasswordMutation,
} from './hooks/useEmployeeQueries';
import { EmployeeModal } from './components/EmployeeModal';
import { DepartmentTreeSelect } from '../../../components/shared/DepartmentTreeSelect';
import type { Employee as EmployeeType } from '../types';
import { getApiErrorMessage } from '../../../utils/helpers';

const SearchInput = React.memo(function SearchInput({
  onSearch,
  placeholder,
  initialValue = '',
}: {
  onSearch: (value: string) => void;
  placeholder: string;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <Input
      placeholder={placeholder}
      prefix={<Search size={16} className="text-slate-400 mr-1" />}
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        setValue(val);
        if (val === '') {
          onSearch('');
        }
      }}
      onPressEnter={() => onSearch(value)}
      allowClear
      className="premium-input"
    />
  );
});

const EmployeeAvatar = React.memo(function EmployeeAvatar({
  avatarUrl,
  initials,
}: {
  avatarUrl?: string | null;
  initials: string;
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!avatarUrl && !imgError;

  return (
    <div className="w-11 h-11 rounded-full bg-white text-slate-600 dark:text-slate-200 flex items-center justify-center font-semibold text-sm flex-shrink-0 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {showImage ? (
        <img
          loading="lazy"
          decoding="async"
          src={avatarUrl!}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain bg-white"
          onError={() => setImgError(true)}
        />
      ) : (
        initials || '?'
      )}
    </div>
  );
});

const EmployeeTable = React.memo(function EmployeeTable({
  isLoading,
  columns,
  employees,
  currentPage,
  pageSize,
  totalCount,
  onChange,
}: {
  isLoading: boolean;
  columns: any[];
  employees: EmployeeType[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onChange: (pagination: any, filters: any, sorter: any) => void;
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spin size="large" tip={t('employee.loading')} />
      </div>
    );
  }
  return (
    <Table
      size="small"
      columns={columns}
      dataSource={employees}
      rowKey="id"
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        total: totalCount,
        showSizeChanger: true,
      }}
      onChange={onChange}
      className="custom-table employee-table"
      scroll={{ x: 'max-content' }}
    />
  );
});

export const Employee: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const prefillSearch = (location.state as { prefillSearch?: string } | null)?.prefillSearch || '';
  const [searchKeyword, setSearchKeyword] = useState(prefillSearch);

  useEffect(() => {
    if (!prefillSearch) return;
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [isAscending, setIsAscending] = useState<boolean | undefined>(undefined);

  const { data, isLoading } = useEmployeesQuery({
    PageNumber: currentPage,
    PageSize: pageSize,
    searchKeyword: searchKeyword || undefined,
    RoleId: selectedRoleId || undefined,
    departmentId: selectedUnitId || undefined,
    SortBy: sortBy,
    IsAscending: isAscending,
  });

  const { data: roles = [], isLoading: rolesLoading } = useRolesQuery();

  const employees = data?.items || [];
  const totalCount = data?.totalCount || 0;

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles]);

  const updateMutation = useUpdateEmployeeMutation();
  const updateUserRolesMutation = useUpdateUserRolesMutation();
  const deleteMutation = useDeleteEmployeeMutation();
  const resetPasswordMutation = useResetPasswordMutation();

  const updateUserRolesMutationRef = useRef(updateUserRolesMutation);
  useEffect(() => {
    updateUserRolesMutationRef.current = updateUserRolesMutation;
  }, [updateUserRolesMutation]);
  const updateUserRoles = useCallback(
    (userId: string, roleIds: string[], options?: Parameters<typeof updateUserRolesMutation.mutate>[1]) => {
      updateUserRolesMutationRef.current.mutate({ userId, roleIds }, options);
    },
    []
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EmployeeType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeType | null>(null);
  const [resetTarget, setResetTarget] = useState<EmployeeType | null>(null);
  const [resetResult, setResetResult] = useState<{ employee: EmployeeType; newPassword?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const roleNameToIdMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    roles.forEach((r) => {
      map[r.name] = r.id;
    });
    return map;
  }, [roles]);

  const getUserRoleIds = useCallback((userRoles: string[] | null | undefined) => {
    return (userRoles || [])
      .map((name) => roleNameToIdMap[name] || name)
      .filter(Boolean);
  }, [roleNameToIdMap]);

  const handleEditClick = useCallback((record: EmployeeType) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(t('employee.toast_delete_success'));
      },
      onError: (err: any) => {
        toast.error(t('employee.toast_delete_error', { error: getApiErrorMessage(err) || t('employee.system_error') }));
      }
    });
  }, [t]);

  const handleResetPassword = useCallback((record: EmployeeType) => {
    resetPasswordMutation.mutate(record.id, {
      onSuccess: (response: any) => {
        const newPassword = response?.newPassword || response?.data?.newPassword || response?.temporaryPassword;
        toast.success(t('employee.toast_reset_password_success', { name: record.fullname || record.username }));
        setResetResult({ employee: record, newPassword });
      },
      onError: (err: any) => {
        toast.error(t('employee.toast_reset_password_error', { error: getApiErrorMessage(err) || t('employee.system_error') }));
      },
    });
  }, [t]);

  const handleFormSubmit = (values: any) => {
    if (editingRecord) {
      updateMutation.mutate(
        {
          id: editingRecord.id,
          data: {
            username: values.username,
            email: values.email || '',
          },
          roleIds: values.roles ? [values.roles] : [],
        },
        {
          onSuccess: () => {
            toast.success(t('employee.toast_update_success'));
            setIsModalOpen(false);
            setEditingRecord(null);
          },
          onError: (err: any) => {
            toast.error(t('employee.toast_update_error', { error: getApiErrorMessage(err) || t('employee.system_error') }));
          }
        }
      );
    }
  };

  const handleTableChange = useCallback((
    pagination: any,
    _filters: any,
    sorter: any
  ) => {
    setCurrentPage(pagination.current || 1);
    if (pagination.pageSize) {
      setPageSize(pagination.pageSize);
    }

    if (sorter && sorter.field && sorter.order) {
      let sortField = sorter.field;
      if (sortField === 'fullname') {
        sortField = 'Fullname';
      } else if (sortField === 'email') {
        sortField = 'Email';
      } else if (sortField === 'phone') {
        sortField = 'PhoneNumber';
      }
      setSortBy(sortField);
      setIsAscending(sorter.order === 'ascend');
    } else {
      setSortBy(undefined);
      setIsAscending(undefined);
    }
  }, []);

  const columns = useMemo(() => [
    {
      title: t('employee.stt'),
      key: 'stt',
      width: 100,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="text-slate-800 dark:text-slate-200">
          {(currentPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: t('employee.employee_col'),
      dataIndex: 'fullname',
      key: 'fullname',
      sorter: true,
      render: (_: any, record: EmployeeType) => {
        const name = record.fullname || record.username || '';
        const initials = name ? name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : '';
        const mnv = record.employeeCode || record.username || '';
        const jobInfo = [record.jobTitleName, record.departmentName].filter(Boolean).join(' - ');   

        return (
          <div className="flex items-center gap-3 py-1">
            <EmployeeAvatar avatarUrl={record.avatarUrl} initials={initials} />
            <div className="flex flex-col min-w-0 gap-0.5">
              <div className="flex items-center gap-2 leading-none">
                <span className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">
                  {name}
                </span>
                {mnv && (
                  <span className="text-11 text-[#00529C] dark:text-slate-500 font-normal flex-shrink-0">
                    {mnv}
                  </span>
                )}
              </div>
              {jobInfo ? (
                <span className="text-11 text-[#00529C] dark:text-blue-400 truncate leading-tight">
                  {jobInfo}
                </span>
              ) : (
                <span className="text-11 text-slate-300 dark:text-slate-600 italic leading-tight"></span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: t('employee.role_col'),
      dataIndex: 'roles',
      key: 'roles',
      width: 300,
      render: (userRoles: string[] | null, record: EmployeeType) => {
        const currentRoleIds = getUserRoleIds(userRoles);
        const activeRoleId = currentRoleIds[0] || undefined;
        const isPendingThisUser = updateUserRolesMutation.isPending && updateUserRolesMutation.variables?.userId === record.id;
        return (
          <RoleSelect
            placeholder={t('employee.select_role_placeholder')}
            className="max-w-[200px]"
            pill
            size="sm"
            searchable={false}
            value={activeRoleId}
            disabled={rolesLoading || isPendingThisUser}
            onChange={(newRoleId) => {
              updateUserRoles(
                record.id,
                [newRoleId],
                {
                  onSuccess: () => {
                    toast.success(t('employee.toast_role_update_success', { name: record.fullname || record.username }));
                  },
                  onError: (err: any) => {
                    toast.error(t('employee.toast_role_update_error', { error: getApiErrorMessage(err) || t('employee.role_update_error_default') }));
                  }
                }
              );
            }}
            options={roleOptions}
          />
        );
      },
    },
    {
      title: t('employee.email_col'),
      dataIndex: 'email',
      key: 'email',
      sorter: true,
      render: (text: string) => (
        text ? (
          <div className="flex items-center gap-1.5 text-[#00529C] dark:text-blue-400">
            <Mail size={13} />
            <span className="text-[12px]">{text}</span>
          </div>
        ) : '-'
      ),
    },
    {
      title: t('employee.phone_col'),
      dataIndex: 'phone',
      key: 'phone',
      sorter: true,
      render: (text: string, record: EmployeeType) => {
        const phoneVal = text || record.phoneNumber;
        return phoneVal ? (
          <div className="flex items-center gap-1.5 text-[#00529C] dark:text-blue-400">
            <Phone size={13} />
            <span className="text-[12px]">{phoneVal}</span>
          </div>
        ) : <span className="text-[12px] italic text-slate-400">{t('employee.empty_field')}</span>;
      },
    },
    {
      title: t('employee.actions_col'),
      key: 'actions',
      align: 'center' as const,
      width: 130,
      render: (_: any, record: EmployeeType) => (
        <div className="flex items-center justify-center gap-1">
          <ActionButton
            type="edit"
            onClick={() => handleEditClick(record)}
          />
          <ActionButton
            type="reset-password"
            loading={resetPasswordMutation.isPending && resetPasswordMutation.variables === record.id}
            onClick={() => setResetTarget(record)}
          />
          <ActionButton
            type="delete"
            loading={deleteMutation.isPending && deleteMutation.variables === record.id}
            onClick={() => setDeleteTarget(record)}
          />
        </div>
      ),
    },
  ], [
    t,
    currentPage,
    pageSize,
    getUserRoleIds,
    roleOptions,
    rolesLoading,
    updateUserRolesMutation.isPending,
    updateUserRolesMutation.variables?.userId,
    updateUserRoles,
    deleteMutation.isPending,
    deleteMutation.variables,
    resetPasswordMutation.isPending,
    resetPasswordMutation.variables,
    handleEditClick,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <style>{`
        .premium-select .ant-select-selection-placeholder {
          font-size: 12px !important;
          color: #94a3b8 !important;
          display: flex !important;
          align-items: center !important;
          height: 100% !important;
          top: 0 !important;
          transform: scale(0.85) !important;
          transform-origin: left center !important;
        }

        .employee-filter-select.premium-select {
          border-color: rgba(0, 82, 156, 0.45) !important;
        }
        .employee-filter-select.premium-select:hover {
          border-color: #00529C !important;
        }
        .dark .employee-filter-select.premium-select {
          border-color: rgba(59, 130, 246, 0.5) !important;
        }
      `}</style>
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
              <Users size={20} className="text-[#00529C] dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">{t('employee.title')}</h2>
              <p className="text-11.5 text-slate-500 dark:text-slate-400">
                {t('employee.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Search Input */}
          <div className="relative w-full sm:w-[320px]">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-11 text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
              {t('employee.search_label')}
            </span>
            <SearchInput
              placeholder={t('employee.search_placeholder')}
              initialValue={prefillSearch}
              onSearch={(val) => {
                setSearchKeyword(val);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Role Filter */}
          <div className="relative w-full sm:w-44">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-11 text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
              {t('employee.role_label')}
            </span>
            <Select
              placeholder={t('employee.all_roles')}
              allowClear
              value={selectedRoleId}
              onChange={(value) => {
                setSelectedRoleId(value);
                setCurrentPage(1);
              }}
              className="w-full premium-select filter-compact employee-filter-select"
              classNames={{ popup: { root: 'premium-select-dropdown' } }}
              suffixIcon={<ChevronDown size={14} className="text-slate-400" />}
              options={roleOptions}
              loading={rolesLoading}
            />
          </div>

          {/* Unit Filter */}
          <div className="relative w-full sm:w-96">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-11 text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
              {t('employee.unit_label')}
            </span>
            <DepartmentTreeSelect
              className="premium-input !min-h-[38px]"
              placeholder={t('employee.all_units')}
              value={selectedUnitId}
              onChange={(value) => {
                setSelectedUnitId(value || undefined);
                setCurrentPage(1);
              }}
              allowClear
              onClear={() => {
                setSelectedUnitId(undefined);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <EmployeeTable
          isLoading={isLoading}
          columns={columns}
          employees={employees}
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={totalCount}
          onChange={handleTableChange}
        />
      </div>

      <EmployeeModal
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        editingRecord={editingRecord}
        onSubmit={handleFormSubmit}
        confirmLoading={updateMutation.isPending}
      />

      <Modal
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onOk={() => {
          if (!deleteTarget) return;
          handleDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        confirmLoading={deleteMutation.isPending}
        okText={t('employee.delete_ok')}
        cancelText={t('employee.delete_cancel')}
        okButtonProps={{ danger: true }}
        centered
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 shrink-0">
              <X size={18} />
            </div>
            <span>{t('employee.delete_confirm_title')}</span>
          </div>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 pl-11.5">
          {t('employee.delete_confirm_desc')}
        </p>
      </Modal>

      <Modal
        open={!!resetTarget}
        onCancel={() => setResetTarget(null)}
        onOk={() => {
          if (!resetTarget) return;
          handleResetPassword(resetTarget);
          setResetTarget(null);
        }}
        confirmLoading={resetPasswordMutation.isPending}
        okText={t('employee.reset_password_ok')}
        cancelText={t('employee.reset_password_cancel')}
        centered
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 shrink-0">
              <KeyRound size={18} />
            </div>
            <span>{t('employee.reset_password_confirm_title')}</span>
          </div>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 pl-11.5">
          {t('employee.reset_password_confirm_desc', { name: resetTarget?.fullname || resetTarget?.username })}
        </p>
      </Modal>

      <Modal
        open={!!resetResult}
        onCancel={() => { setResetResult(null); setCopied(false); }}
        footer={null}
        centered
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 shrink-0">
              <Check size={18} />
            </div>
            <span>{t('employee.reset_password_result_title')}</span>
          </div>
        }
      >
        <div className="pl-11.5 flex flex-col gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('employee.reset_password_result_desc', { name: resetResult?.employee.fullname || resetResult?.employee.username })}
          </p>
          {resetResult?.newPassword && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
              <span className="flex-1 font-mono text-sm text-slate-800 dark:text-slate-100 select-all">
                {resetResult.newPassword}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resetResult.newPassword || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    // Clipboard API may be unavailable (e.g. insecure context) — the password stays visible for manual copy.
                  }
                }}
                className="flex items-center gap-1 text-xs font-medium text-[#00529C] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg px-2 py-1"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? t('employee.copied') : t('employee.copy')}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Employee;

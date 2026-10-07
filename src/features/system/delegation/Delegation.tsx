import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Table, Modal, Select } from 'antd';
import { Search, X, RotateCw, Undo2, Handshake, UserCheck, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '../../../hooks';
import { toast } from '../../../store/toastStore';
import { ActionButton, Switch } from '../../../components/ui';
import { DepartmentTreeSelect } from '../../../components/shared/DepartmentTreeSelect';
import { getApiErrorMessage } from '../../../utils/helpers';
import { DelegationModal, type DelegationFormValues } from './components/DelegationModal';
import {
  useDelegationsQuery,
  useCreateDelegationMutation,
  useUpdateDelegationMutation,
  useDeleteDelegationMutation,
} from './hooks/useDelegationQueries';
import type { IDelegation } from '../../../services/api/delegationAPI';

const PAGE_SIZE = 20;
const EMPTY_DELEGATIONS: IDelegation[] = [];

type DelegationStatus = 'upcoming' | 'active' | 'expired' | 'revoked';

function getEffectiveStatus(d: IDelegation): DelegationStatus {
  if (!d.isActive) return 'revoked';
  const today = dayjs().startOf('day');
  if (dayjs(d.startDate).startOf('day').isAfter(today)) return 'upcoming';
  if (dayjs(d.endDate).startOf('day').isBefore(today)) return 'expired';
  return 'active';
}

function formatDateVN(iso: string): string {
  return dayjs(iso).format('DD/MM/YYYY');
}

const AVATAR_PALETTE = [
  'bg-blue-50 text-[#00529C] dark:bg-blue-950/40 dark:text-blue-300',
  'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
  'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300',
  'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
  'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[hash];
}

const PersonCell = React.memo(function PersonCell({
  name,
  position,
  avatarUrl,
}: {
  name: string;
  position: string;
  avatarUrl?: string;
}) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center gap-2.5 py-1">
      {avatarUrl && !imgError ? (
        <img
          loading="lazy"
          decoding="async"
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-10 h-10 rounded-full object-contain shrink-0 shadow-sm border border-slate-200 dark:border-slate-800 bg-white"
        />
      ) : (
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-11 shrink-0 shadow-sm border border-slate-200 dark:border-slate-800 ${getAvatarClass(name)}`}
        >
          {getInitials(name)}
        </div>
      )}
      <div className="flex flex-col min-w-0 gap-0.5">
        <span className="font-semibold text-[#00529C] dark:text-slate-100 text-13 truncate">{name}</span>
        <span className="text-11.5 text-slate-500 dark:text-slate-400 font-normal truncate">{position}</span>
      </div>
    </div>
  );
});

const DelegationTable = React.memo(function DelegationTable({
  columns,
  dataSource,
  loading,
  pagination,
}: {
  columns: any[];
  dataSource: IDelegation[];
  loading: boolean;
  pagination: any;
}) {
  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="id"
      loading={loading}
      pagination={pagination}
      className="custom-table"
      scroll={{ x: 'max-content' }}
    />
  );
});

export const Delegation: React.FC = () => {
  const { t } = useTranslation();

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDelegation, setEditingDelegation] = useState<IDelegation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IDelegation | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<IDelegation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading, isFetching, refetch } = useDelegationsQuery({
    PageNumber: currentPage,
    PageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const delegations = data?.items ?? EMPTY_DELEGATIONS;
  const totalCount = data?.totalCount ?? 0;

  const createMutation = useCreateDelegationMutation();
  const updateMutation = useUpdateDelegationMutation();
  const deleteMutation = useDeleteDelegationMutation();
  const togglePendingId = updateMutation.isPending ? updateMutation.variables?.id : undefined;

  const [searchParams, setSearchParams] = useSearchParams();
  const urlId = searchParams.get('id') || searchParams.get('delegationId');

  useEffect(() => {
    if (urlId && delegations.length > 0) {
      const match = delegations.find((d) => d.id === urlId);
      if (match) {
        setEditingDelegation(match);
        setIsModalOpen(true);
      }
    }
  }, [urlId, delegations]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDelegation(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('id');
        next.delete('delegationId');
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, selectedUnitId]);

  const pagedData = useMemo(() => {
    return delegations.filter((d) => {
      if (statusFilter !== 'all' && getEffectiveStatus(d) !== statusFilter) return false;
      if (selectedUnitId && d.leader?.departmentId !== selectedUnitId && d.secretary?.departmentId !== selectedUnitId) return false;
      return true;
    });
  }, [delegations, statusFilter, selectedUnitId]);

  const hasActiveFilters = !!searchInput || statusFilter !== 'all' || !!selectedUnitId;

  const handleResetFilters = () => {
    setSearchInput('');
    setStatusFilter('all');
    setSelectedUnitId(undefined);
    refetch();
  };

  const openCreateModal = () => {
    setEditingDelegation(null);
    setIsModalOpen(true);
  };

  const openEditModal = (record: IDelegation) => {
    setEditingDelegation(record);
    setIsModalOpen(true);
  };

  const toIsoDate = (d: string) => new Date(d).toISOString();

  const handleModalSubmit = (values: DelegationFormValues) => {
    const payload = {
      secretaryId: values.secretaryId,
      startDate: toIsoDate(values.startDate),
      endDate: toIsoDate(values.endDate),
      isActive: true,
    };

    if (editingDelegation) {
      updateMutation.mutate(
        { id: editingDelegation.id, data: payload },
        {
          onSuccess: () => {
            toast.success(t('delegation.toast_update_success'));
            setIsModalOpen(false);
          },
          onError: (err: any) => toast.error(getApiErrorMessage(err) || t('delegation.toast_update_error')),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(t('delegation.toast_create_success'));
          setIsModalOpen(false);
        },
        onError: (err: any) => toast.error(getApiErrorMessage(err) || t('delegation.toast_create_error')),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('delegation.toast_delete_success'));
        setActionLoading(false);
        setDeleteTarget(null);
      },
      onError: (err: any) => {
        toast.error(getApiErrorMessage(err) || t('delegation.toast_delete_error'));
        setActionLoading(false);
        setDeleteTarget(null);
      },
    });
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    setActionLoading(true);
    updateMutation.mutate(
      {
        id: revokeTarget.id,
        data: {
          secretaryId: revokeTarget.secretaryId,
          startDate: revokeTarget.startDate,
          endDate: revokeTarget.endDate,
          isActive: false,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('delegation.toast_revoke_success'));
          setActionLoading(false);
          setRevokeTarget(null);
        },
        onError: (err: any) => {
          toast.error(getApiErrorMessage(err) || t('delegation.toast_revoke_error'));
          setActionLoading(false);
          setRevokeTarget(null);
        },
      }
    );
  };

  const handleToggleActive = (record: IDelegation) => {
    const nextActive = !record.isActive;
    updateMutation.mutate(
      {
        id: record.id,
        data: {
          secretaryId: record.secretaryId,
          startDate: record.startDate,
          endDate: record.endDate,
          isActive: nextActive,
        },
      },
      {
        onSuccess: () => {
          toast.success(t(nextActive ? 'delegation.toast_toggle_on' : 'delegation.toast_toggle_off'));
        },
        onError: (err: any) => toast.error(getApiErrorMessage(err) || t('delegation.toast_toggle_error')),
      }
    );
  };

  const statusOptions = [
    { value: 'all', label: t('delegation.status_all') },
    { value: 'active', label: t('delegation.status_active') },
    { value: 'upcoming', label: t('delegation.status_upcoming') },
    { value: 'expired', label: t('delegation.status_expired') },
    { value: 'revoked', label: t('delegation.status_revoked') },
  ];

  const columns = useMemo(
    () => [
      {
        title: t('delegation.stt'),
        key: 'stt',
        width: 70,
        align: 'center' as const,
        render: (_: any, __: any, index: number) => (
          <span className="text-slate-800 dark:text-slate-200">{(currentPage - 1) * PAGE_SIZE + index + 1}</span>
        ),
      },
      {
        title: t('delegation.col_delegator'),
        key: 'delegator',
        render: (_: any, record: IDelegation) => (
          <PersonCell
            name={record.leader?.fullname || ''}
            position={record.leader?.positionName || record.leader?.jobTitleName || ''}
            avatarUrl={record.leader?.avatarUrl}
          />
        ),
      },
      {
        title: t('delegation.col_secretary'),
        key: 'secretary',
        render: (_: any, record: IDelegation) => (
          <PersonCell
            name={record.secretary?.fullname || ''}
            position={record.secretary?.positionName || record.secretary?.jobTitleName || ''}
            avatarUrl={record.secretary?.avatarUrl}
          />
        ),
      },
      {
        title: t('delegation.col_period'),
        key: 'period',
        render: (_: any, record: IDelegation) => (
          <span className="text-13 font-normal text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {formatDateVN(record.startDate)} - {formatDateVN(record.endDate)}
          </span>
        ),
      },
      {
        title: t('delegation.col_status'),
        key: 'status',
        align: 'center' as const,
        render: (_: any, record: IDelegation) => (
          <div className="flex items-center justify-center">
            <Switch
              checked={record.isActive}
              loading={togglePendingId === record.id}
              onChange={() => handleToggleActive(record)}
              size="sm"
            />
          </div>
        ),
      },
      {
        title: t('delegation.actions_col'),
        key: 'actions',
        width: 110,
        align: 'center' as const,
        render: (_: any, record: IDelegation) => {
          const s = getEffectiveStatus(record);
          const canRevoke = s === 'active' || s === 'upcoming';
          return (
            <div className="flex items-center justify-center gap-1">
              <ActionButton type="edit" onClick={() => openEditModal(record)} />
              {canRevoke && <ActionButton type="revoke" onClick={() => setRevokeTarget(record)} />}
              <ActionButton type="delete" onClick={() => setDeleteTarget(record)} />
            </div>
          );
        },
      },
    ],
    [t, currentPage, togglePendingId]
  );

  const pagination = useMemo(
    () => ({
      current: currentPage,
      pageSize: PAGE_SIZE,
      total: totalCount,
      onChange: (page: number) => setCurrentPage(page),
    }),
    [currentPage, totalCount]
  );

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
              <Handshake size={20} className="text-[#00529C] dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {t('delegation.title')}
              </h2>
              <p className="text-11.5 text-slate-500 dark:text-slate-400">{t('delegation.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openCreateModal}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-0 bg-gradient-to-b from-[#2E8BE6] to-[#1F78D6] text-white text-[13.5px] font-semibold shadow-[0_1px_2px_rgba(15,60,120,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#2580DC] hover:to-[#196ECB] hover:shadow-[0_4px_10px_-2px_rgba(15,60,120,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-200 cursor-pointer"
            >
              <UserCheck size={17} className="shrink-0" />
              <span>{t('delegation.add_btn')}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 pt-1">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-11 font-semibold text-[#00529C] dark:text-blue-400 z-10 leading-none">
              {t('delegation.search_label')}
            </span>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('delegation.search_placeholder')}
                className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border border-[#00529C]/45 dark:border-blue-500/50 bg-white dark:bg-slate-900 dark:text-slate-100 text-[13px] placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 hover:border-[#003e75] focus:border-[#003e75] focus:outline-none focus:ring-4 focus:ring-[#00529C]/10"
              />
            </div>
          </div>

          <div className="relative w-full sm:w-56">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-11 font-semibold text-[#00529C] dark:text-blue-400 z-10 leading-none">
              {t('delegation.status_label')}
            </span>
            {/* Same look as the Employee "Vai trò" filter: "all" shows as a grey placeholder, slim grey chevron */}
            <Select
              value={statusFilter === 'all' ? undefined : statusFilter}
              placeholder={t('delegation.status_all')}
              allowClear
              onChange={(value) => setStatusFilter(value ?? 'all')}
              className="w-full premium-select h-10 filter-compact !border-[#00529C]/45 hover:!border-[#00529C] dark:!border-blue-500/50"
              classNames={{ popup: { root: 'premium-select-dropdown' } }}
              suffixIcon={<ChevronDown size={14} className="text-slate-400" />}
              options={statusOptions}
            />
          </div>

          <div className="relative w-full sm:w-64">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-11 font-semibold text-[#00529C] dark:text-blue-400 z-10 leading-none">
              {t('delegation.department_label')}
            </span>
            <DepartmentTreeSelect
              className="!h-[38px] !rounded-xl !border-[#00529C]/45 dark:!border-blue-500/50"
              placeholder={t('delegation.department_placeholder')}
              popupMinWidth={420}
              value={selectedUnitId}
              onChange={(value) => setSelectedUnitId(value || undefined)}
              allowClear
              onClear={() => setSelectedUnitId(undefined)}
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={isFetching}
              className="flex items-center gap-1.5 h-[38px] px-4 rounded-xl border border-[#00529C]/45 dark:border-blue-500/50 bg-white dark:bg-slate-900 text-[12.5px] font-medium text-[#00529C] dark:text-blue-400 cursor-pointer transition-all duration-200 hover:bg-blue-50 dark:hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
            >
              <RotateCw size={14} className={isFetching ? 'animate-spin' : ''} />
              {t('delegation.refresh_btn')}
            </button>
          )}
        </div>
      </div>

      <DelegationTable columns={columns} dataSource={pagedData} loading={isLoading} pagination={pagination} />

      <DelegationModal
        open={isModalOpen}
        onCancel={handleCloseModal}
        onSubmit={handleModalSubmit}
        editing={editingDelegation}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <Modal
        open={!!revokeTarget}
        onCancel={() => setRevokeTarget(null)}
        onOk={handleRevoke}
        confirmLoading={actionLoading}
        okText={t('delegation.revoke_ok')}
        cancelText={t('delegation.revoke_cancel')}
        okButtonProps={{ danger: true }}
        centered
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 shrink-0">
              <Undo2 size={18} />
            </div>
            <span>{t('delegation.revoke_confirm_title')}</span>
          </div>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 pl-11.5">{t('delegation.revoke_confirm_desc')}</p>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onOk={handleDelete}
        confirmLoading={actionLoading}
        okText={t('delegation.delete_ok')}
        cancelText={t('delegation.delete_cancel')}
        okButtonProps={{ danger: true }}
        centered
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 shrink-0">
              <X size={18} />
            </div>
            <span>{t('delegation.delete_confirm_title')}</span>
          </div>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 pl-11.5">{t('delegation.delete_confirm_desc')}</p>
      </Modal>
    </div>
  );
};

export default Delegation;

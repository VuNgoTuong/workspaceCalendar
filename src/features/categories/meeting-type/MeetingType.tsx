import React, { useCallback, useMemo, useState } from 'react';
import { Table, Modal, Input } from 'antd';
import { Search, Pencil, Trash2, Calendar, AlertTriangle, FolderPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '../../../components/ui/Switch';
import {
  FormModal,
  FormModalHeader,
  FormModalBody,
  FormModalFooter,
  formFieldLabel as fieldLabel,
} from '../../../components/ui/FormModal';
import { toast } from '../../../store/toastStore';
import { getApiErrorMessage } from '../../../utils/helpers';
import {
  useScheduleTypesQuery,
  useCreateScheduleTypeMutation,
  useUpdateScheduleTypeMutation,
  useDeleteScheduleTypeMutation,
} from './hooks/useScheduleTypeQueries';
import type { IScheduleType } from '../../../services/api/scheduleTypeAPI';

const PAGE_SIZE = 10;

export const MeetingTypeCategory: React.FC = () => {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const { data, isLoading, isFetching } = useScheduleTypesQuery({
    PageNumber: currentPage,
    PageSize: pageSize,
    search: searchKeyword || undefined,
  });
  const list = data?.items || [];
  const totalCount = data?.totalCount || 0;

  const createMutation = useCreateScheduleTypeMutation();
  const updateMutation = useUpdateScheduleTypeMutation();
  const deleteMutation = useDeleteScheduleTypeMutation();
  const togglePendingId = updateMutation.isPending ? updateMutation.variables?.id : undefined;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IScheduleType | null>(null);
  const [formData, setFormData] = useState<{ code: string; name: string; isActive: boolean }>({
    code: '',
    name: '',
    isActive: true,
  });

  const [deletingItem, setDeletingItem] = useState<IScheduleType | null>(null);

  const handleSearch = () => {
    setSearchKeyword(searchInput.trim());
    setCurrentPage(1);
  };

  const handleToggleActive = useCallback((item: IScheduleType) => {
    const updatedStatus = !item.isActive;
    updateMutation.mutate(
      { id: item.id, data: { name: item.name, code: item.code, isActive: updatedStatus } },
      {
        onSuccess: () => {
          toast.success(t(updatedStatus ? 'meeting_type.toast_toggle_on' : 'meeting_type.toast_toggle_off', { name: item.name }));
        },
        onError: (err: any) => toast.error(getApiErrorMessage(err) || t('meeting_type.toast_toggle_error')),
      }
    );
  }, [updateMutation, t]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = useCallback((item: IScheduleType) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  }, []);

  const handleSave = () => {
    if (!formData.code.trim()) {
      toast.error(t('meeting_type.code_required'));
      return;
    }
    if (!formData.name.trim()) {
      toast.error(t('meeting_type.name_required'));
      return;
    }

    const payload = { code: formData.code.trim(), name: formData.name.trim(), isActive: formData.isActive };

    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, data: payload },
        {
          onSuccess: () => {
            toast.success(t('meeting_type.toast_update_success', { name: payload.name }));
            setIsModalOpen(false);
          },
          onError: (err: any) => toast.error(getApiErrorMessage(err) || t('meeting_type.toast_update_error')),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(t('meeting_type.toast_create_success', { name: payload.name }));
          setIsModalOpen(false);
        },
        onError: (err: any) => toast.error(getApiErrorMessage(err) || t('meeting_type.toast_create_error')),
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    deleteMutation.mutate(deletingItem.id, {
      onSuccess: () => {
        toast.success(t('meeting_type.toast_delete_success', { name: deletingItem.name }));
        setDeletingItem(null);
      },
      onError: (err: any) => {
        toast.error(getApiErrorMessage(err) || t('meeting_type.toast_delete_error'));
        setDeletingItem(null);
      },
    });
  };

  const columns = useMemo(() => [
    {
      title: t('meeting_type.stt'),
      key: 'stt',
      width: 70,
      align: 'center' as const,
      render: (_: unknown, __: IScheduleType, index: number) => (
        <span className="text-slate-800 dark:text-slate-200">{(currentPage - 1) * pageSize + index + 1}</span>
      ),
    },
    {
      title: t('meeting_type.col_code'),
      dataIndex: 'code',
      key: 'code',
      width: 180,
      align: 'center' as const,
      render: (code: string) => <span className="font-mono text-13 font-medium text-slate-700 dark:text-slate-300">{code}</span>,
    },
    {
      title: t('meeting_type.col_name'),
      dataIndex: 'name',
      key: 'name',
      align: 'center' as const,
      render: (name: string) => (
        <div className="flex flex-col items-center justify-center">
          <span className="font-medium text-13 text-slate-800 dark:text-slate-100">{name}</span>
        </div>
      ),
    },
    {
      title: t('meeting_type.col_status'),
      key: 'isActive',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: IScheduleType) => (
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
      title: t('meeting_type.col_actions'),
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: IScheduleType) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEdit(record)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-transparent text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
            title={t('common.action_edit')}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => setDeletingItem(record)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            title={t('common.action_delete')}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ], [t, currentPage, pageSize, togglePendingId, handleToggleActive, handleOpenEdit, setDeletingItem]);

  return (
    <div className="flex flex-col gap-5 pb-8 select-none">
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
              <Calendar size={20} className="text-[#00529C] dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {t('meeting_type.title')}
              </h2>
              <p className="text-11.5 text-slate-500 dark:text-slate-400">
                {t('meeting_type.subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-0 bg-gradient-to-b from-[#2E8BE6] to-[#1F78D6] text-white text-[13.5px] font-semibold shadow-[0_1px_2px_rgba(15,60,120,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#2580DC] hover:to-[#196ECB] hover:shadow-[0_4px_10px_-2px_rgba(15,60,120,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-200 cursor-pointer self-end sm:self-auto"
          >
            <FolderPlus size={17} className="shrink-0" />
            <span>{t('meeting_type.add_btn')}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
              {t('meeting_type.search_label')}
            </span>
            <Input
              placeholder={t('meeting_type.search_placeholder')}
              prefix={<Search size={16} className="text-slate-400 mr-1" />}
              value={searchInput}
              onChange={(e) => {
                const val = e.target.value;
                setSearchInput(val);
                if (val === '') {
                  setSearchKeyword('');
                  setCurrentPage(1);
                }
              }}
              onPressEnter={handleSearch}
              allowClear
              className="premium-input"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={isLoading || isFetching}
          className="custom-table meeting-type-table"
          pagination={{
            current: currentPage,
            pageSize,
            total: totalCount,
            onChange: (page, size) => {
              if (size !== pageSize) {
                setPageSize(size);
                setCurrentPage(1);
              } else {
                setCurrentPage(page);
              }
            },
            showSizeChanger: true,
          }}
        />
      </div>

      <FormModal open={isModalOpen} onCancel={() => setIsModalOpen(false)} width="clamp(520px, 48vw, 660px)">
        <FormModalHeader
          title={editingItem ? t('meeting_type.modal_edit_title') : t('meeting_type.modal_add_title')}
          subtitle={editingItem ? t('meeting_type.modal_edit_subtitle') : t('meeting_type.modal_add_subtitle')}
          onClose={() => setIsModalOpen(false)}
        />

        <FormModalBody>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              {fieldLabel(t('meeting_type.code_label'))}
              <span className="text-red-500">*</span>
            </div>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
              placeholder={t('meeting_type.code_placeholder')}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-13 transition-all focus:outline-none focus:ring-4 focus:ring-[#00529C]/10 focus:border-[#00529C]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              {fieldLabel(t('meeting_type.name_label'))}
              <span className="text-red-500">*</span>
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('meeting_type.name_placeholder')}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-13 transition-all focus:outline-none focus:ring-4 focus:ring-[#00529C]/10 focus:border-[#00529C]"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('meeting_type.active_label')}</span>
            <Switch
              checked={formData.isActive}
              onChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
        </FormModalBody>

        <FormModalFooter
          onCancel={() => setIsModalOpen(false)}
          cancelText={t('meeting_type.modal_cancel')}
          submitText={editingItem ? t('meeting_type.modal_edit_ok') : t('meeting_type.modal_add_ok')}
          loading={createMutation.isPending || updateMutation.isPending}
          htmlType="button"
          onSubmit={handleSave}
        />
      </FormModal>

      <Modal
        title={
          <div className="flex items-center gap-2 text-red-600 font-semibold text-base">
            <AlertTriangle size={18} />
            <span>{t('meeting_type.delete_confirm_title')}</span>
          </div>
        }
        open={!!deletingItem}
        onCancel={() => setDeletingItem(null)}
        onOk={handleConfirmDelete}
        okText={t('meeting_type.delete_ok')}
        cancelText={t('meeting_type.delete_cancel')}
        confirmLoading={deleteMutation.isPending}
        okButtonProps={{ danger: true, className: '!rounded-xl !h-9 !px-4' }}
        cancelButtonProps={{ className: '!rounded-xl !h-9 !px-4' }}
      >
        <p className="text-13 text-slate-600 dark:text-slate-300 py-2">
          {t('meeting_type.delete_confirm_desc', { name: deletingItem?.name, code: deletingItem?.code })}
        </p>
      </Modal>
    </div>
  );
};

export default MeetingTypeCategory;

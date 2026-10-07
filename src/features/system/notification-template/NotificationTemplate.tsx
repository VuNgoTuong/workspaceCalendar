import { toast } from '../../../store/toastStore';
import React, { useState, useMemo, useCallback } from 'react';
import { Table, Input, Modal, Switch } from 'antd';
import { Search, BellRing, BellPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ActionButton } from '../../../components/ui';
import {
  useNotificationTemplatesQuery,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
} from './hooks/useNotificationTemplateQueries';
import { NotificationTemplateModal } from './components/NotificationTemplateModal';
import type { INotificationTemplate } from '../types';
import { getApiErrorMessage } from '../../../utils/helpers';

const PAGE_SIZE = 20;

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const NotificationTemplateTable = React.memo(function NotificationTemplateTable({
  columns,
  templates,
  isLoading,
  pagination,
}: {
  columns: any[];
  templates: INotificationTemplate[];
  isLoading: boolean;
  pagination: any;
}) {
  return (
    <Table
      size="small"
      columns={columns}
      dataSource={templates}
      rowKey="id"
      loading={isLoading}
      pagination={pagination}
      className="custom-table"
      scroll={{ x: 1100 }}
    />
  );
});

export const NotificationTemplate: React.FC = () => {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<INotificationTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<INotificationTemplate | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, isLoading } = useNotificationTemplatesQuery({
    PageNumber: currentPage,
    PageSize: PAGE_SIZE,
    searchTerm: searchTerm || undefined,
  });
  const updateMutation = useUpdateTemplateMutation();
  const deleteMutation = useDeleteTemplateMutation();

  const templates = data?.items || [];
  const totalCount = data?.totalCount || 0;

  const handleAddClick = useCallback(() => {
    setEditingRecord(null);
    setIsModalOpen(true);
  }, []);

  const handleEditClick = useCallback((record: INotificationTemplate) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  }, []);

  const handleToggleActive = useCallback((record: INotificationTemplate, checked: boolean) => {
    setUpdatingId(record.id);
    updateMutation.mutate(
      {
        id: record.id,
        data: {
          code: record.code,
          subject: record.subject,
          body: record.body,
          isActive: checked,
        },
      },
      {
        onSuccess: () => {
          toast.success(checked ? t('notification_template.toast_toggle_active_on') : t('notification_template.toast_toggle_active_off'));
          setUpdatingId(null);
        },
        onError: (err: any) => {
          toast.error(getApiErrorMessage(err) || t('notification_template.status_toggle_error_default'));
          setUpdatingId(null);
        },
      }
    );
  }, [updateMutation, t]);

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(t('notification_template.toast_delete_success')),
      onError: (err: any) => toast.error(t('notification_template.toast_delete_error', { error: getApiErrorMessage(err) || t('notification_template.delete_error_default') })),
    });
  };

  const columns = useMemo(() => [
    {
      title: t('notification_template.stt'),
      key: 'stt',
      width: 70,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="text-slate-600 dark:text-slate-300">{(currentPage - 1) * PAGE_SIZE + index + 1}</span>
      ),
    },
    {
      title: t('notification_template.code_col'),
      dataIndex: 'code',
      key: 'code',
      width: 220,
      render: (code: string) => (
        <span className="font-medium text-[#00529C] dark:text-blue-400">{code}</span>
      ),
    },
    {
      title: t('notification_template.subject_col'),
      dataIndex: 'subject',
      key: 'subject',
      width: 280,
      render: (subject: string) => (
        <span className="font-medium text-slate-800 dark:text-slate-100">{subject}</span>
      ),
    },
    {
      title: t('notification_template.body_col'),
      dataIndex: 'body',
      key: 'body',
      width: 360,
      ellipsis: true,
      render: (body: string) => {
        const text = stripHtml(body || '');
        return (
          <span className="text-xs text-slate-500 dark:text-slate-400" title={text}>
            {text}
          </span>
        );
      },
    },
    {
      title: t('notification_template.status_col'),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 110,
      align: 'center' as const,
      render: (isActive: boolean | undefined, record: INotificationTemplate) => (
        <Switch
          checked={isActive !== false}
          onChange={(checked) => handleToggleActive(record, checked)}
          loading={updatingId === record.id}
        />
      ),
    },
    {
      title: t('notification_template.actions_col'),
      key: 'actions',
      width: 90,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: any, record: INotificationTemplate) => (
        <div className="flex items-center justify-center gap-1">
          <ActionButton type="edit" onClick={() => handleEditClick(record)} />
          <ActionButton type="delete" onClick={() => setDeleteTarget(record)} />
        </div>
      ),
    },
  ], [t, currentPage, handleEditClick, handleToggleActive, updatingId]);

  const handlePageChange = useCallback((page: number) => setCurrentPage(page), []);
  const pagination = useMemo(() => ({
    current: currentPage,
    pageSize: PAGE_SIZE,
    total: totalCount,
    onChange: handlePageChange,
  }), [currentPage, totalCount, handlePageChange]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
              <BellRing size={20} className="text-[#00529C] dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {t('notification_template.title')}
              </h2>
              <p className="text-11.5 text-slate-500 dark:text-slate-400">
                {t('notification_template.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddClick}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-0 bg-gradient-to-b from-[#2E8BE6] to-[#1F78D6] text-white text-[13.5px] font-semibold shadow-[0_1px_2px_rgba(15,60,120,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#2580DC] hover:to-[#196ECB] hover:shadow-[0_4px_10px_-2px_rgba(15,60,120,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-200 cursor-pointer"
          >
            <BellPlus size={17} className="shrink-0" />
            <span>{t('notification_template.add_btn')}</span>
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
            {t('notification_template.search_label')}
          </span>
          <Input
            placeholder={t('notification_template.search_placeholder')}
            prefix={<Search size={16} className="text-slate-400 mr-1" />}
            value={searchInput}
            onChange={(e) => {
              const val = e.target.value;
              setSearchInput(val);
              if (val === '') {
                setSearchTerm('');
                setCurrentPage(1);
              }
            }}
            onPressEnter={() => {
              setSearchTerm(searchInput.trim());
              setCurrentPage(1);
            }}
            allowClear
            className="premium-input"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <NotificationTemplateTable
          columns={columns}
          templates={templates}
          isLoading={isLoading}
          pagination={pagination}
        />
      </div>

      <NotificationTemplateModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        editingRecord={editingRecord}
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
        okText={t('notification_template.delete_ok')}
        cancelText={t('notification_template.delete_cancel')}
        okButtonProps={{ danger: true }}
        centered
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 shrink-0">
              <X size={18} />
            </div>
            <span>{t('notification_template.delete_confirm_title')}</span>
          </div>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 pl-11.5">
          {deleteTarget && t('notification_template.delete_confirm_desc', { code: deleteTarget.code })}
        </p>
      </Modal>
    </div>
  );
};

export default NotificationTemplate;

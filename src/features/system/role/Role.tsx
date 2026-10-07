import { toast } from '../../../store/toastStore';
import React, { useState, useMemo, useCallback } from 'react';
import { Table, Modal, Form, Input, Spin } from 'antd';
import { Search, X, Shield, ShieldPlus } from 'lucide-react';
import { useDebounce } from '../../../hooks';
import { useTranslation } from 'react-i18next';
import { ActionButton } from '../../../components/ui';
import {
  FormModal,
  FormModalHeader,
  FormModalBody,
  FormModalFooter,
  formFieldLabel as fieldLabel,
  formInputClass as inputClass,
} from '../../../components/ui/FormModal';
import {
  useRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from './hooks/useRoleQueries';
import type { IRole } from '../../../services/api/roleAPI';

const PAGE_SIZE = 20;

const RoleTable = React.memo(function RoleTable({
  roleColumns,
  roles,
  pagination,
}: {
  roleColumns: any[];
  roles: IRole[];
  pagination: any;
}) {
  return (
    <Table
      columns={roleColumns}
      dataSource={roles}
      rowKey="id"
      pagination={pagination}
      className="custom-table"
    />
  );
});

export const Role: React.FC = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data, isLoading } = useRolesQuery({
    PageNumber: currentPage,
    PageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const roles = data?.items || [];
  const totalCount = data?.totalCount || 0;

  const createMutation = useCreateRoleMutation();
  const updateRoleMutation = useUpdateRoleMutation();
  const deleteRoleMutation = useDeleteRoleMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<IRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IRole | null>(null);
  const [form] = Form.useForm();

  const openCreateModal = () => {
    setEditingRole(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (role: IRole) => {
    setEditingRole(role);
    form.setFieldsValue({ name: role.name });
    setIsModalOpen(true);
  };

  const handleModalSubmit = (values: { name: string }) => {
    if (editingRole) {
      updateRoleMutation.mutate(
        { id: editingRole.id, name: values.name },
        {
          onSuccess: () => {
            toast.success(t('role.toast_update_success'));
            setIsModalOpen(false);
          },
          onError: () => {
            toast.error(t('role.toast_update_error'));
          },
        }
      );
    } else {
      createMutation.mutate(
        { name: values.name },
        {
          onSuccess: () => {
            toast.success(t('role.toast_create_success'));
            setIsModalOpen(false);
          },
          onError: () => {
            toast.error(t('role.toast_create_error'));
          },
        }
      );
    }
  };

  const handleDeleteRole = (id: string) => {
    deleteRoleMutation.mutate(id, {
      onSuccess: () => {
        toast.success(t('role.toast_delete_success'));
      },
      onError: () => {
        toast.error(t('role.toast_delete_error'));
      },
    });
  };

  const roleColumns = useMemo(() => [
    {
      title: t('role.stt'),
      key: 'stt',
      width: 80,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="text-slate-800 dark:text-slate-200">{(currentPage - 1) * PAGE_SIZE + index + 1}</span>
      ),
    },
    {
      title: t('role.name_col'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span className="font-medium text-slate-800 dark:text-slate-200">{name}</span>
      ),
    },
    {
      title: t('role.actions_col'),
      key: 'actions',
      width: 90,
      align: 'center' as const,
      render: (_: any, record: IRole) =>
        record.isSystemRole && record.name?.toLowerCase() !== 'Administrator' ? (
          <span className="text-11 text-slate-400 dark:text-slate-500">—</span>
        ) : (
          <div className="flex items-center justify-center gap-1">
            <ActionButton
              type="edit"
              onClick={() => openEditModal(record)}
            />
            <ActionButton type="delete" onClick={() => setDeleteTarget(record)} />
          </div>
        ),
    },
  ], [t, currentPage]);

  const handlePageChange = useCallback((page: number) => setCurrentPage(page), []);
  const pagination = useMemo(() => ({
    current: currentPage,
    pageSize: PAGE_SIZE,
    total: totalCount,
    onChange: handlePageChange,
  }), [currentPage, totalCount, handlePageChange]);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
              <Shield size={20} className="text-[#00529C] dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">{t('role.title')}</h2>
              <p className="text-11.5 text-slate-500 dark:text-slate-400">
                {t('role.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-0 bg-gradient-to-b from-[#2E8BE6] to-[#1F78D6] text-white text-[13.5px] font-semibold shadow-[0_1px_2px_rgba(15,60,120,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#2580DC] hover:to-[#196ECB] hover:shadow-[0_4px_10px_-2px_rgba(15,60,120,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-200 cursor-pointer"
          >
            <ShieldPlus size={17} className="shrink-0" />
            <span>{t('role.add_btn')}</span>
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
            {t('role.search_label')}
          </span>
          <Input
            placeholder={t('role.search_placeholder')}
            prefix={<Search size={16} className="text-slate-400 mr-1" />}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setCurrentPage(1);
            }}
            allowClear
            className="premium-input"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spin size="large" tip={t('role.loading')} />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <RoleTable roleColumns={roleColumns} roles={roles} pagination={pagination} />
        </div>
      )}

      <FormModal open={isModalOpen} onCancel={() => setIsModalOpen(false)} width={560}>
        <FormModalHeader
          title={editingRole ? t('role.modal_edit_title') : t('role.modal_add_title')}
          subtitle={editingRole ? t('role.modal_edit_subtitle') : t('role.modal_add_subtitle')}
          onClose={() => setIsModalOpen(false)}
        />

        <Form
          form={form}
          layout="vertical"
          name="roleForm"
          initialValues={{ name: '' }}
          onFinish={handleModalSubmit}
          className="flex flex-col"
        >
          <FormModalBody>
            <Form.Item
              name="name"
              label={fieldLabel(t('role.name_label'))}
              rules={[
                { required: true, message: t('role.name_required') },
                { max: 50, message: t('role.name_max') },
              ]}
              className="mb-0"
            >
              <Input placeholder={t('role.name_placeholder')} maxLength={50} className={inputClass} />
            </Form.Item>
          </FormModalBody>

          <FormModalFooter
            onCancel={() => setIsModalOpen(false)}
            cancelText={t('role.modal_cancel')}
            submitText={editingRole ? t('role.modal_edit_ok') : t('role.modal_add_ok')}
            loading={createMutation.isPending || updateRoleMutation.isPending}
          />
        </Form>
      </FormModal>

      <Modal
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onOk={() => {
          if (!deleteTarget) return;
          handleDeleteRole(deleteTarget.id);
          setDeleteTarget(null);
        }}
        confirmLoading={deleteRoleMutation.isPending}
        okText={t('role.delete_ok')}
        cancelText={t('role.delete_cancel')}
        okButtonProps={{ danger: true }}
        centered
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 shrink-0">
              <X size={18} />
            </div>
            <span>{t('role.delete_confirm_title')}</span>
          </div>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 pl-11.5">
          {t('role.delete_confirm_desc')}
        </p>
      </Modal>
    </div>
  );
};

export default Role;

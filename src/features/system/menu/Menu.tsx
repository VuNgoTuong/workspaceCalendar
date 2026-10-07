import { toast } from '../../../store/toastStore';
import React, { useState, useMemo, useCallback } from 'react';
import { Table, Input, Modal, Spin } from 'antd';
import { Search, ChevronDown, ChevronRight, X, MenuIcon, FolderPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '../../../hooks';
import { getMenuIcon } from '../../../constants/iconRegistry';
import {
  useMenusQuery,
  useCreateMenuMutation,
  useUpdateMenuMutation,
  useDeleteMenuMutation,
} from './hooks/useMenuQueries';
import { MenuModal } from './components/MenuModal';
import type { MenuItem } from '../types';
import { ActionButton, StatusBadge, Badge } from '../../../components/ui';
import { getApiErrorMessage } from '../../../utils/helpers';

const renderIcon = (iconName: string) => {
  const IconComponent = getMenuIcon(iconName);
  return <IconComponent size={16} className="text-slate-500" />;
};

const MenuTable = React.memo(function MenuTable({
  columns,
  menus,
  expandable,
}: {
  columns: any[];
  menus: MenuItem[];
  expandable: any;
}) {
  return (
    <Table
      columns={columns}
      dataSource={menus}
      rowKey="id"
      pagination={{ pageSize: 10, showSizeChanger: true }}
      className="custom-table"
      scroll={{ x: 'max-content' }}
      childrenColumnName="__noop_children"
      expandable={expandable}
    />
  );
});

export const MenuManagement: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MenuItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const { data: menus = [], isLoading } = useMenusQuery({ search: debouncedSearchQuery });
  const createMutation = useCreateMenuMutation();
  const updateMutation = useUpdateMenuMutation();
  const deleteMutation = useDeleteMenuMutation();

  const handleEditClick = useCallback((record: MenuItem) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(t('menu.toast_delete_success'));
      },
      onError: (err: any) => {
        toast.error(t('menu.toast_delete_error', { error: getApiErrorMessage(err) || t('errors.system_error') }));
      }
    });
  }, [deleteMutation, t]);

  const handleFormSubmit = useCallback((values: any) => {
    if (editingRecord) {
      updateMutation.mutate(
        { id: editingRecord.id, data: values },
        {
          onSuccess: () => {
            toast.success(t('menu.toast_update_success'));
            setIsModalOpen(false);
            setEditingRecord(null);
          },
        }
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success(t('menu.toast_create_success'));
          setIsModalOpen(false);
        },
      });
    }
  }, [editingRecord, updateMutation, createMutation, t]);

  const handleModalCancel = useCallback(() => {
    setIsModalOpen(false);
    setEditingRecord(null);
  }, []);

  const menuNameById = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (items: MenuItem[]) => {
      items.forEach((m) => {
        map.set(m.id, m.name);
        if (m.children && m.children.length) walk(m.children);
      });
    };
    walk(menus);
    return map;
  }, [menus]);

  const getParentName = useCallback((parentId: string | null) => {
    if (!parentId) return null;
    return menuNameById.get(parentId) ?? null;
  }, [menuNameById]);

  const columns = useMemo(() => [
    {
      title: t('menu.stt'),
      key: 'stt',
      width: 70,
      align: 'center' as const,
      render: (_: any, __: MenuItem, index: number) => (
        <span className="text-slate-800 dark:text-slate-200">
          {index + 1}
        </span>
      ),
    },
    {
      title: t('menu.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <span className="font-medium text-slate-800 dark:text-slate-200">
          {text}
        </span>
      ),
    },
    {
      title: t('menu.url'),
      dataIndex: 'url',
      key: 'url',
      render: (text: string) => <span className="font-mono text-sm text-slate-500">{text}</span>,
    },
    {
      title: t('menu.icon'),
      dataIndex: 'icon',
      key: 'icon',
      align: 'center' as const,
      render: (icon: string) => (
        <div className="flex justify-center items-center gap-2">
          {renderIcon(icon)}
          <span className="text-xs text-slate-400 font-mono">({icon})</span>
        </div>
      ),
    },
    {
      title: t('menu.parent'),
      dataIndex: 'parentId',
      key: 'parentId',
      render: (parentId: string | null) => {
        const name = getParentName(parentId);
        return name ? (
          <Badge variant="blue">{name}</Badge>
        ) : (
          <span className="text-slate-400 italic text-xs">{t('menu.parent_menu')}</span>
        );
      },
    },
    {
      title: t('menu.index'),
      dataIndex: 'index',
      key: 'index',
      align: 'center' as const,
      sorter: (a: MenuItem, b: MenuItem) => a.index - b.index,
      render: (index: number) => <span className="font-medium text-slate-600">{index}</span>,
    },
    {
      title: t('menu.status'),
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'center' as const,
      render: (isActive: boolean) => <StatusBadge status={isActive ? 'active' : 'inactive'} />,
    },
    {
      title: t('menu.thao_tac'),
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: MenuItem) => (
        <div className="flex items-center justify-center gap-1">
          <ActionButton
            type="edit"
            onClick={() => handleEditClick(record)}
          />
          <ActionButton type="delete" onClick={() => setDeleteTarget(record)} />
        </div>
      ),
    },
  ], [t, handleEditClick, getParentName]);

  const nestedColumns = useMemo(() => [
    {
      title: t('menu.stt'),
      key: 'stt',
      width: 70,
      align: 'center' as const,
      render: (_: any, __: MenuItem, index: number) => (
        <span className="text-slate-500 dark:text-slate-400 text-sm">{index + 1}</span>
      ),
    },
    {
      title: t('menu.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <span className="font-medium text-slate-600 dark:text-slate-400 font-medium">
          {text}
        </span>
      ),
    },
    {
      title: t('menu.url'),
      dataIndex: 'url',
      key: 'url',
      render: (text: string) => <span className="font-mono text-sm text-slate-500">{text}</span>,
    },
    {
      title: t('menu.icon'),
      dataIndex: 'icon',
      key: 'icon',
      align: 'center' as const,
      render: (icon: string) => (
        <div className="flex justify-center items-center gap-2">
          {renderIcon(icon)}
          <span className="text-xs text-slate-400 font-mono">({icon})</span>
        </div>
      ),
    },
    {
      title: t('menu.parent'),
      dataIndex: 'parentId',
      key: 'parentId',
      render: (parentId: string | null) => {
        const name = getParentName(parentId);
        return name ? (
          <Badge variant="blue">{name}</Badge>
        ) : (
          <span className="text-slate-400 italic text-xs">{t('menu.parent_menu')}</span>
        );
      },
    },
    {
      title: t('menu.index'),
      dataIndex: 'index',
      key: 'index',
      align: 'center' as const,
      render: (index: number) => <span className="font-medium text-slate-600">{index}</span>,
    },
    {
      title: t('menu.status'),
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'center' as const,
      render: (isActive: boolean) => <StatusBadge status={isActive ? 'active' : 'inactive'} />,
    },
    {
      title: t('menu.thao_tac'),
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: MenuItem) => (
        <div className="flex items-center justify-center gap-1">
          <ActionButton
            type="edit"
            onClick={() => handleEditClick(record)}
          />
          <ActionButton type="delete" onClick={() => setDeleteTarget(record)} />
        </div>
      ),
    },
  ], [t, handleEditClick, getParentName]);

  const expandable = useMemo(() => ({
    expandIconColumnIndex: 1,
    expandIcon: ({ expanded, onExpand, record }: any) => {
      if (!record.children || record.children.length === 0) return null;
      return expanded ? (
        <span
          onClick={(e: React.MouseEvent) => onExpand(record, e)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#00529C] dark:text-blue-400 cursor-pointer mr-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
        >
          <ChevronDown size={14} />
        </span>
      ) : (
        <span
          onClick={(e: React.MouseEvent) => onExpand(record, e)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-pointer mr-2 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors"
        >
          <ChevronRight size={14} />
        </span>
      );
    },
    expandedRowRender: (record: MenuItem) => {
      if (!record.children || record.children.length === 0) return null;
      return (
        <div className="p-2 rounded-2xl mx-4 my-1">
          <Table
            columns={nestedColumns}
            dataSource={record.children}
            rowKey="id"
            pagination={false}
            size="small"
            className="nested-table-custom rounded-xl overflow-hidden bg-white dark:bg-slate-900"
            scroll={{ x: 'max-content' }}
          />
        </div>
      );
    },
  }), [nestedColumns]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
              <MenuIcon size={20} className="text-[#00529C] dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">{t('menu.title')}</h2>
              <p className="text-11.5 text-slate-500 dark:text-slate-400">
                {t('menu.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingRecord(null);
              setIsModalOpen(true);
            }}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-0 bg-gradient-to-b from-[#2E8BE6] to-[#1F78D6] text-white text-[13.5px] font-semibold shadow-[0_1px_2px_rgba(15,60,120,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#2580DC] hover:to-[#196ECB] hover:shadow-[0_4px_10px_-2px_rgba(15,60,120,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-200 cursor-pointer"
          >
            <FolderPlus size={17} className="shrink-0" />
            <span>{t('menu.add_btn')}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
              {t('menu.search_label')}
            </span>
            <Input
              placeholder={t('menu.search_placeholder')}
              prefix={<Search size={18} className="text-slate-400 mr-1" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="premium-input"
              allowClear
            />
          </div>
        </div>
      </div>

      <style>{`
        .nested-table-wrapper {
          background-color: #f8fafc !important; 
          border: 1px solid #f1f5f9 !important; 
          box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.02) !important;
        }
        .dark .nested-table-wrapper {
          background-color: #0f172a !important; 
          border: 1px solid #334155 !important; 
        }
        .nested-table-custom {
          background-color: #ffffff !important;
          border: 1px solid #f1f5f9 !important; 
        }
        .dark .nested-table-custom {
          background-color: #1e293b !important;
          border: 1px solid #334155 !important;
        }
        .nested-table-custom .ant-table-thead > tr > th {
          background-color: #f8fafc !important;
          color: #64748b !important;
          font-weight: 600 !important;
          font-size: 11.5px !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark .nested-table-custom .ant-table-thead > tr > th {
          background-color: #1e293b !important;
          color: #94a3b8 !important;
          font-size: 10.5px !important;
          border-bottom: 1px solid #334155 !important;
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Spin size="large" tip={t('menu.loading')} />
          </div>
        ) : (
          <MenuTable columns={columns} menus={menus} expandable={expandable} />
        )}
      </div>

      <MenuModal
        open={isModalOpen}
        onCancel={handleModalCancel}
        editingRecord={editingRecord}
        onSubmit={handleFormSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        allMenus={menus}
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
        okText={t('menu.delete_ok')}
        cancelText={t('menu.delete_cancel')}
        okButtonProps={{ danger: true }}
        centered
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 shrink-0">
              <X size={18} />
            </div>
            <span>{t('menu.delete_confirm')}</span>
          </div>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 pl-11.5">
          {deleteTarget?.name}
        </p>
      </Modal>
    </div>
  );
};
export default MenuManagement;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Form, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Employee } from '../../types';
import {
  useEmployeeDetailQuery,
  usePermissionMetadataQuery,
  usePermissionDefinitionsQuery,
  useEmployeeDepartmentPermissions,
} from '../hooks/useEmployeeQueries';
import { ShieldCheck, Pencil, Save, RotateCcw } from 'lucide-react';
import { toast } from '../../../../store/toastStore';
import { getApiErrorMessage } from '../../../../utils/helpers';
import { TreeTable } from '../../../../components/ui/TreeTable';
import type { TreeTableColumn } from '../../../../components/ui/TreeTable';
import { useDepartmentsQuery, fetchDepartmentChildren } from '../../../categories/department/hooks/useDepartmentQueries';
import type { IDepartment } from '../../../../services/api/departmentAPI';
import { useDeptPermissionCascade } from '../../../../hooks/useDeptPermissionCascade';
import {
  FormModal,
  FormModalHeader,
  FormModalBody,
  FormSectionCard,
  FormModalFooter,
  ReadOnlyField,
} from '../../../../components/ui/FormModal';

const DEPARTMENT_PAGE_SIZE = 20;

interface EmployeeModalProps {
  open: boolean;
  onCancel: () => void;
  editingRecord: Employee | null;
  onSubmit: (values: any) => void;
  confirmLoading: boolean;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  open,
  onCancel,
  editingRecord,
  onSubmit,
  confirmLoading,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { data: employeeDetail } = useEmployeeDetailQuery(open ? editingRecord?.id : undefined);
  const source: any = employeeDetail || editingRecord;

  const { data: permissionMetadata } = usePermissionMetadataQuery();
  const { data: permissionDefinitions = [] } = usePermissionDefinitionsQuery();

  const departmentResourceType = permissionMetadata?.resourceTypes.find((rt) => rt.name.toLowerCase() === 'department')?.value;
  const userGranteeType = permissionMetadata?.granteeTypes.find((gt) => gt.name.toLowerCase() === 'user')?.value;
  const permissionDefs = permissionDefinitions.length > 0
    ? permissionDefinitions
    : (permissionMetadata?.permissions ?? []);
  const departmentPermissionMask = permissionDefs.reduce((acc, def) => acc | def.value, 0);
  const departmentMetadataReady =
    departmentResourceType !== undefined &&
    userGranteeType !== undefined &&
    departmentPermissionMask > 0;

  const {
    deptPermMap,
    initialDeptPermMap,
    loading: deptPermLoading,
    saving: deptSaving,
    hasChanges: deptHasChanges,
    handleToggleAssigned: handleToggleDeptAssigned,
    handleCancel: handleCancelDeptChanges,
    handleSave: handleSaveDeptPermissionsRaw,
  } = useEmployeeDepartmentPermissions(
    open ? editingRecord?.id : undefined,
    departmentResourceType,
    userGranteeType,
    departmentPermissionMask
  );

  const [deptPage, setDeptPage] = useState(1);
  const [deptPageSize, setDeptPageSize] = useState(DEPARTMENT_PAGE_SIZE);
  useEffect(() => {
    setDeptPage(1);
  }, [editingRecord?.id]);

  const departmentsParams = useMemo(
    () => ({ PageNumber: deptPage, PageSize: deptPageSize, level: 1, isActive: true }),
    [deptPage, deptPageSize]
  );
  const { data: departmentsData, isLoading: departmentsLoading } = useDepartmentsQuery(departmentsParams);
  const loadDeptChildren = useCallback(
    (parentId: string | number, _record: IDepartment, page: number) => fetchDepartmentChildren(parentId, page, true),
    []
  );

  const {
    registerRecords: registerDeptRecords,
    registerChildren: registerDeptChildren,
    getState: getDeptCascadeState,
  } = useDeptPermissionCascade(deptPermMap, initialDeptPermMap);
  useEffect(() => {
    registerDeptRecords(departmentsData?.items || []);
  }, [departmentsData?.items, registerDeptRecords]);

  const handleSaveDeptPermissions = useCallback(async () => {
    if (!editingRecord) return;
    try {
      const saved = await handleSaveDeptPermissionsRaw();
      if (!saved) return;
      toast.success(t('employee.toast_department_update_success', { name: editingRecord.fullname || editingRecord.username }));
    } catch (err: any) {
      toast.error(t('employee.toast_department_update_error', { error: getApiErrorMessage(err) || t('employee.system_error') }));
    }
  }, [editingRecord, handleSaveDeptPermissionsRaw, t]);

  const departmentColumns: TreeTableColumn<IDepartment>[] = useMemo(() => [
    {
      key: 'name',
      title: t('permission.department_name_col'),
      isTreeColumn: true,
      render: (_v, record) => (
        <div>
          <div className="text-13.5 font-medium text-slate-800 dark:text-slate-100">{record.name}</div>
          <div className="mt-0.5 text-11.5 font-medium tracking-tight text-slate-500 dark:text-slate-500">{record.code}</div>
        </div>
      ),
    },
    {
      key: 'assigned',
      title: t('permission.department_assigned_col'),
      align: 'center' as const,
      width: 120,
      render: (_v, record) => {
        const { checked, locked } = getDeptCascadeState(record.id);
        const checkbox = (
          <Checkbox
            checked={checked}
            disabled={!editingRecord || !departmentMetadataReady || deptSaving || locked}
            onChange={(e) => handleToggleDeptAssigned(record.id, e.target.checked)}
          />
        );
        return locked ? (
          <Tooltip title={t('permission.department_locked_tooltip', 'Đã tự động chọn theo đơn vị cha, lưu thay đổi để chỉnh riêng từng đơn vị con')}>
            {checkbox}
          </Tooltip>
        ) : checkbox;
      },
    },
  ], [t, editingRecord, departmentMetadataReady, deptSaving, handleToggleDeptAssigned, getDeptCascadeState]);

  const handleFinish = (values: any) => {
    onSubmit(values);
  };

  return (
    <FormModal open={open} onCancel={onCancel} width={1150}>
      <FormModalHeader
        title={t('employee.modal.title')}
        subtitle={t('employee.modal.subtitle')}
        onClose={onCancel}
      />

      <Form form={form} layout="vertical" onFinish={handleFinish} className="flex flex-col">
        <FormModalBody>
          <FormSectionCard number={1} title={t('employee.modal.section_info')}>
            <div className="flex flex-col gap-3">
              <ReadOnlyField label={t('employee.modal.fullname')} value={source?.fullname} />
              <div className="grid grid-cols-2 gap-3">
                <ReadOnlyField label={t('employee.modal.employee_code')} value={source?.employeeCode} />
                <ReadOnlyField label={t('employee.modal.phone')} value={source?.phone ?? source?.phoneNumber} />
                <ReadOnlyField label={t('employee.modal.unit')} value={source?.unitName ?? source?.departmentName} />
                <ReadOnlyField label={t('employee.modal.title_field')} value={source?.title ?? source?.jobTitleName ?? source?.positionName} />
                <ReadOnlyField label={t('employee.modal.email')} value={source?.email} />
                <ReadOnlyField label={t('employee.modal.username')} value={source?.username} />
                <ReadOnlyField label={t('employee.modal.roles')} value={(source?.roles || []).join(', ')} />
              </div>
            </div>
          </FormSectionCard>

          <FormSectionCard
            number={2}
            title={
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#00529C] dark:text-blue-400" />
                {t('employee.modal.section_department_permission')}
              </span>
            }
            highlight
            badge={
              <>
                <Pencil size={10} />
                {t('employee.modal.editable_badge')}
              </>
            }
          >
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-11 text-slate-500 dark:text-slate-400">
                  {t('employee.modal.department_permission_desc')}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {deptHasChanges && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-11 font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      {t('permission.unsaved')}
                    </span>
                  )}
                  <Button
                    type="default"
                    size="small"
                    icon={<RotateCcw size={13} />}
                    onClick={handleCancelDeptChanges}
                    disabled={!deptHasChanges || deptSaving}
                    className="flex items-center gap-1 text-xs font-medium rounded-lg"
                  >
                    {t('permission.cancel_changes')}
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<Save size={13} />}
                    onClick={handleSaveDeptPermissions}
                    loading={deptSaving}
                    disabled={!deptHasChanges}
                    className="flex items-center gap-1 text-xs font-semibold rounded-lg"
                  >
                    {deptSaving ? t('permission.saving') : t('permission.save_changes')}
                  </Button>
                </div>
              </div>
              <TreeTable
                key={editingRecord?.id || 'none'}
                columns={departmentColumns}
                dataSource={departmentsData?.items || []}
                rowKey="id"
                loading={departmentsLoading || deptPermLoading}
                loadChildren={loadDeptChildren}
                onChildrenLoaded={registerDeptChildren}
                pagination={{
                  current: deptPage,
                  pageSize: deptPageSize,
                  total: departmentsData?.totalCount || 0,
                  onChange: (page, size) => {
                    if (size !== deptPageSize) {
                      setDeptPageSize(size);
                      setDeptPage(1);
                    } else {
                      setDeptPage(page);
                    }
                  },
                }}
              />
            </div>
          </FormSectionCard>
        </FormModalBody>

        {/* Nút "Cập nhật" đang bị ẩn theo yêu cầu - vai trò tự lưu qua mutation riêng, phân quyền đơn vị lưu qua nút "Lưu thay đổi" ở trên. */}
        {false && (
          <FormModalFooter
            onCancel={onCancel}
            cancelText={t('employee.modal.cancel')}
            submitText={t('employee.modal.submit')}
            loading={confirmLoading}
          />
        )}
        <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
          <Button
            onClick={onCancel}
            className="h-12 min-w-[130px] !rounded-full border-slate-200 px-8 text-15 font-semibold text-slate-600 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:!border-[#00529C] hover:!text-[#00529C] hover:!bg-blue-50/50 active:scale-[0.98]"
          >
            {t('employee.modal.cancel')}
          </Button>
        </div>
      </Form>
    </FormModal>
  );
};

export default EmployeeModal;

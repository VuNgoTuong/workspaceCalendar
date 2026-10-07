import React, { useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { DatePicker } from 'antd';
import { Mail, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  FormModal,
  FormModalHeader,
  FormModalBody,
  FormModalFooter,
  formFieldLabel as fieldLabel,
} from '../../../../components/ui/FormModal';
import { PagedPickerSelect } from '../../../../components/ui/PagedPickerSelect';
import { userAPI } from '../../../../services/api/userAPI';
import { useMySecretaryIdsQuery } from '../hooks/useDelegationQueries';
import type { Employee } from '../../../system/types';
import type { IDelegation } from '../../../../services/api/delegationAPI';

export interface DelegationFormValues {
  secretaryId: string;
  startDate: string;
  endDate: string;
}

interface DelegationModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: DelegationFormValues) => void;
  editing?: IDelegation | null;
  loading?: boolean;
}

const initialsOf = (name: string) =>
  name.split(' ').filter(Boolean).slice(-2).map((n) => n[0]).join('').toUpperCase();

const EMPTY_VALUES: DelegationFormValues = {
  secretaryId: '',
  startDate: '',
  endDate: '',
};

const { RangePicker } = DatePicker;

export const DelegationModal: React.FC<DelegationModalProps> = ({ open, onCancel, onSubmit, editing, loading }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<DelegationFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof DelegationFormValues, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      setValues({
        secretaryId: editing.secretaryId,
        startDate: editing.startDate ? editing.startDate.slice(0, 10) : '',
        endDate: editing.endDate ? editing.endDate.slice(0, 10) : '',
      });
    } else {
      setValues({ ...EMPTY_VALUES, startDate: dayjs().format('YYYY-MM-DD') });
    }
  }, [open, editing]);

  const { data: mySecretaryDelegations = [] } = useMySecretaryIdsQuery(open);
  const usedSecretaryIds = useMemo(
    () => new Set(mySecretaryDelegations.filter((d) => d.isActive).map((d) => d.secretaryId)),
    [mySecretaryDelegations]
  );

  const initialSecretaryRecord = useMemo<Employee | undefined>(() => {
    if (!editing?.secretary) return undefined;
    return {
      id: editing.secretary.id,
      username: editing.secretary.username,
      fullname: editing.secretary.fullname,
      email: editing.secretary.email,
      employeeCode: editing.secretary.employeeCode,
      phoneNumber: editing.secretary.phoneNumber,
      departmentName: editing.secretary.departmentName,
      jobTitleName: editing.secretary.jobTitleName,
      positionName: editing.secretary.positionName,
      avatarUrl: editing.secretary.avatarUrl,
    };
  }, [editing?.id, open]);

  const fetchSecretaries = async ({ search, page, pageSize }: { search: string; page: number; pageSize: number }) => {
    const res = await userAPI.getUsers({ searchKeyword: search, PageNumber: page, PageSize: pageSize });
    return { items: (res.items || []) as Employee[], total: res.totalCount || 0 };
  };

  const handleSubmit = () => {
    const nextErrors: Partial<Record<keyof DelegationFormValues, string>> = {};
    if (!values.secretaryId) nextErrors.secretaryId = t('delegation.secretary_required');
    if (!values.startDate) nextErrors.startDate = t('delegation.start_date_required');
    if (!values.endDate) nextErrors.endDate = t('delegation.end_date_required');
    if (values.startDate && values.endDate && values.startDate > values.endDate) {
      nextErrors.endDate = t('delegation.end_date_before_start');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(values);
  };

  return (
    <FormModal open={open} onCancel={onCancel} width="clamp(480px, 55vw, 760px)">
      <FormModalHeader
        title={editing ? t('delegation.modal_edit_title') : t('delegation.modal_add_title')}
        subtitle={editing ? t('delegation.modal_edit_subtitle') : t('delegation.modal_add_subtitle')}
        onClose={onCancel}
      />

      <FormModalBody>
        <div className="flex flex-col gap-1.5">
          {fieldLabel(t('delegation.secretary_label'))}
          <PagedPickerSelect<Employee>
            key={`secretary-${editing?.id || 'new'}`}
            initialRecord={initialSecretaryRecord}
            fetchPage={fetchSecretaries}
            getValue={(e) => e.id}
            getLabel={(e) => e.fullname}
            renderOption={(e) => {
              const phone = e.phone || e.phoneNumber;
              const jobInfo = [e.jobTitleName, e.departmentName].filter(Boolean).join(' · ');
              const isUsed = usedSecretaryIds.has(e.id) && e.id !== editing?.secretaryId;
              return (
                <div className="flex items-center gap-2.5 py-0.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {initialsOf(e.fullname)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-13 font-medium text-slate-800 dark:text-slate-100 truncate">{e.fullname}</span>
                      {e.employeeCode && (
                        <span className="shrink-0 text-[10.5px] font-normal text-[#00529C] dark:text-blue-400">{e.employeeCode}</span>
                      )}
                      {isUsed && (
                        <span className="shrink-0 text-[10.5px] text-red-400">· {t('delegation.already_secretary')}</span>
                      )}
                    </div>
                    {jobInfo && (
                      <div className="text-[10.5px] text-[#00529C]/80 dark:text-blue-400/80 truncate leading-tight">{jobInfo}</div>
                    )}
                    {(e.email || phone) && (
                      <div className="flex items-center gap-2.5 mt-0.5 text-[10.5px] text-slate-400 dark:text-slate-500">
                        {e.email && (
                          <span className="flex min-w-0 items-center gap-1 truncate">
                            <Mail size={10} className="shrink-0" />
                            <span className="truncate">{e.email}</span>
                          </span>
                        )}
                        {phone && (
                          <span className="flex shrink-0 items-center gap-1">
                            <Phone size={10} className="shrink-0" />
                            {phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
            isOptionDisabled={(e) => usedSecretaryIds.has(e.id) && e.id !== editing?.secretaryId}
            onChange={(id) => {
              setValues((prev) => ({ ...prev, secretaryId: id }));
              setErrors((prev) => ({ ...prev, secretaryId: undefined }));
            }}
            placeholder={t('delegation.secretary_placeholder')}
          />
          {errors.secretaryId && <span className="text-xs font-medium text-red-500 pl-1">{errors.secretaryId}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          {fieldLabel(t('delegation.date_range_label'))}
          <RangePicker
            size="large"
            className="w-full"
            status={errors.startDate || errors.endDate ? 'error' : undefined}
            value={[values.startDate ? dayjs(values.startDate) : null, values.endDate ? dayjs(values.endDate) : null]}
            format="DD/MM/YYYY"
            placeholder={[t('delegation.start_date_label'), t('delegation.end_date_label')]}
            onChange={(range: [Dayjs | null, Dayjs | null] | null) => {
              setValues((prev) => ({
                ...prev,
                startDate: range && range[0] ? range[0].format('YYYY-MM-DD') : '',
                endDate: range && range[1] ? range[1].format('YYYY-MM-DD') : '',
              }));
              setErrors((prev) => ({ ...prev, startDate: undefined, endDate: undefined }));
            }}
          />
          {(errors.startDate || errors.endDate) && (
            <span className="text-xs font-medium text-red-500 pl-1">{errors.startDate || errors.endDate}</span>
          )}
        </div>
      </FormModalBody>

      <FormModalFooter
        onCancel={onCancel}
        cancelText={t('delegation.modal_cancel')}
        submitText={editing ? t('delegation.modal_edit_ok') : t('delegation.modal_add_ok')}
        loading={loading}
        htmlType="button"
        onSubmit={handleSubmit}
      />
    </FormModal>
  );
};

export default DelegationModal;

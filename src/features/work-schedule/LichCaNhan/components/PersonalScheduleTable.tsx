import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Table, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { Building2, Video, Users, AlertCircle, Lock } from 'lucide-react';
import { ActionButton, StatusBadge } from '../../../../components/ui';
import { cn } from '../../../../utils/helpers';
import { ParticipantsTooltip } from '../../components/ParticipantsTooltip';
import type { PersonalScheduleEvent } from '../types';

interface PersonalScheduleTableProps {
  data: PersonalScheduleEvent[];
  loading?: boolean;
  currentUserId?: string;
  onRowClick?: (record: PersonalScheduleEvent) => void;
  onEdit: (record: PersonalScheduleEvent) => void;
  onDelete: (record: PersonalScheduleEvent) => void;
  onCancel: (record: PersonalScheduleEvent) => void;
  onDuplicate: (record: PersonalScheduleEvent) => void;
  onApprove: (record: PersonalScheduleEvent) => void;
  onReject: (record: PersonalScheduleEvent) => void;
  onViewParticipants: (record: PersonalScheduleEvent) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  scrollY?: string | number;
}

const getRowStatusClass = (record: PersonalScheduleEvent): string => {
  if (record.priority === 'urgent') {
    return 'row-priority-urgent';
  }
  const status = String(record.status || '').toLowerCase();
  switch (status) {
    case 'created':
    case '2':
      return 'row-status-created';
    case 'approved':
    case '4':
      return 'row-status-approved';
    case 'pending':
    case 'waiting':
    case '3':
      return 'row-status-pending';
    case 'draft':
    case '1':
      return 'row-status-draft';
    case 'rejected':
    case '5':
      return 'row-status-rejected';
    case 'cancelled':
    case '6':
      return 'row-status-cancelled';
    default:
      return '';
  }
};

export const PersonalScheduleTable: React.FC<PersonalScheduleTableProps> = React.memo(({
  data,
  loading,
  currentUserId,
  onRowClick,
  onEdit,
  onDelete,
  onCancel,
  onDuplicate,
  onApprove,
  onReject,
  onViewParticipants,
  page,
  pageSize,
  total,
  onPageChange,
  scrollY,
}) => {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      {
        title: t('common.stt') || 'STT',
        key: 'stt',
        width: 50,
        align: 'center' as const,
        render: (_: unknown, __: PersonalScheduleEvent, index: number) => (
          <span className="text-12 font-medium text-slate-500 dark:text-slate-400">
            {(page - 1) * pageSize + index + 1}
          </span>
        ),
      },
      {
        title: t('personal_calendar.col_code') || 'Mã',
        key: 'code',
        width: 120,
        render: (_: unknown, record: PersonalScheduleEvent) => {
          const codeVal = record.code || (record.id ? `LCN-${record.id.slice(0, 6).toUpperCase()}` : '—');
          return (
            <span className="text-11 font-medium text-[#00529C] dark:text-blue-400 whitespace-nowrap">
              {codeVal}
            </span>
          );
        },
      },
      {
        title: t('personal_calendar.col_title'),
        key: 'title',
        width: 280,
        render: (_: unknown, record: PersonalScheduleEvent) => {
          return (
            <div className="flex flex-col gap-0.5 py-0.5 max-w-[280px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <Tooltip title={record.title} placement="topLeft">
                  <span
                    className="font-medium text-[#00529C] dark:text-blue-400 text-[13px] leading-snug line-clamp-2 cursor-pointer"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {record.title}
                  </span>
                </Tooltip>
                {record.isConfidential && (
                  <Tooltip title={t('personal_calendar.confidential_busy', { defaultValue: 'Lịch bảo mật' })}>
                    <Lock size={13} className="text-red-500 dark:text-red-400 shrink-0" />
                  </Tooltip>
                )}
                {record.priority === 'urgent' && (
                  <Tooltip title={t('personal_calendar.priority_urgent', { defaultValue: 'Khẩn cấp' })}>
                    <AlertCircle size={14} className="text-red-500 dark:text-red-400 shrink-0" />
                  </Tooltip>
                )}
              </div>

              {record.scheduleTypeName && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    {record.scheduleTypeName}
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: t('personal_calendar.col_time'),
        key: 'time',
        width: 130,
        render: (_: unknown, record: PersonalScheduleEvent) => {
          const sameDay = record.startDate === record.endDate;
          return (
            <div className="flex flex-col">
              <span className="text-12 font-normal text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {sameDay
                  ? dayjs(record.startDate).format('DD/MM/YYYY')
                  : `${dayjs(record.startDate).format('DD/MM')} - ${dayjs(record.endDate).format('DD/MM/YYYY')}`}
              </span>
              <span className="text-11 font-light text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {record.startTime} - {record.endTime}
              </span>
            </div>
          );
        },
      },
      {
        title: t('personal_calendar.col_location') || 'Địa điểm & Hình thức',
        key: 'location',
        width: 160,
        render: (_: unknown, record: PersonalScheduleEvent) => {
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-11.5 font-normal">
                {record.meetingFormat === 'online' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    <Video size={12} className="shrink-0" />
                    {t('personal_calendar.format_online')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#00529C] dark:text-blue-400 whitespace-nowrap">
                    <Building2 size={12} className="shrink-0" />
                    {t('personal_calendar.format_offline')}
                  </span>
                )}
              </div>
              {record.location ? (
                <span className="text-11 font-light text-slate-400 dark:text-slate-500 whitespace-nowrap truncate max-w-[140px]" title={record.location}>
                  {record.location}
                </span>
              ) : (
                <span className="text-11 font-light text-slate-400 dark:text-slate-500">...</span>
              )}
            </div>
          );
        },
      },
      {
        title: t('personal_calendar.col_participants') || 'Tham dự',
        key: 'meta',
        width: 120,
        align: 'center' as const,
        render: (_: unknown, record: PersonalScheduleEvent) => {
          const hasParticipants = record.participants && record.participants.length > 0;

          if (!hasParticipants) {
            return <span className="text-11 text-slate-400">—</span>;
          }

          return (
            <div className="flex items-center justify-center">
              <ParticipantsTooltip participants={record.participants}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewParticipants(record);
                  }}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-12 font-medium bg-[#f0f4f8] dark:bg-slate-800/80 text-[#00529C] dark:text-blue-400 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-blue-50 hover:text-[#00529C] hover:border-blue-300 dark:hover:bg-blue-950/50 dark:hover:text-blue-300 transition-all duration-200 shadow-2xs select-none"
                >
                  <Users size={12} className="text-[#00529C] dark:text-blue-400 shrink-0" />
                  <span className="font-medium text-12 text-[#00529C] dark:text-blue-400">
                    {t('personal_calendar.participants_count', { count: record.participants.length })}
                  </span>
                </button>
              </ParticipantsTooltip>
            </div>
          );
        },
      },
      {
        title: t('personal_calendar.col_status'),
        key: 'status',
        width: 120,
        align: 'center' as const,
        render: (_: unknown, record: PersonalScheduleEvent) => <StatusBadge status={record.status} size="sm" />,
      },
      {
        title: t('personal_calendar.col_actions'),
        key: 'actions',
        width: 170,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: PersonalScheduleEvent) => {
          const canApprove = record.status === 'pending' && !!currentUserId && record.ownerUserId === currentUserId;
          const statusStr = String(record.status || '').toLowerCase();
          const isDuplicateOnly = statusStr === 'cancelled' || statusStr === '6' || statusStr === 'rejected' || statusStr === '5';

          return (
            <div className="flex items-center justify-center gap-0" onClick={(e) => e.stopPropagation()}>
              {canApprove && (
                <>
                  <ActionButton type="approve" onClick={() => onApprove(record)} />
                  <ActionButton type="reject" onClick={() => onReject(record)} />
                </>
              )}
              {isDuplicateOnly ? (
                <ActionButton type="duplicate" onClick={() => onDuplicate(record)} />
              ) : (
                <>
                  <ActionButton type="edit" onClick={() => onEdit(record)} />
                  <ActionButton type="cancel" tooltip={t('personal_calendar.cancel_ok')} onClick={() => onCancel(record)} />
                  <ActionButton type="delete" onClick={() => onDelete(record)} />
                </>
              )}
            </div>
          );
        },
      },
    ],
    [t, page, pageSize, currentUserId, onEdit, onCancel, onDelete, onDuplicate, onApprove, onReject, onViewParticipants]
  );

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      size="small"
      loading={loading}
      className="custom-table [&_.ant-table-tbody>tr:not(.ant-table-measure-row)>td]:!py-1.5 [&_.ant-table-tbody>tr:not(.ant-table-measure-row)>td]:!px-2.5 [&_.ant-table-tbody>tr.ant-table-measure-row>td]:!p-0 [&_.ant-table-tbody>tr.ant-table-measure-row>td]:!h-0 [&_.ant-table-thead>tr>th]:!py-2.5 [&_.ant-table-thead>tr>th]:!px-2.5"
      scroll={{ x: 'max-content', y: scrollY }}
      onRow={(record) => ({
        onClick: () => onRowClick?.(record),
        className: cn(
          onRowClick ? 'cursor-pointer' : undefined,
          getRowStatusClass(record)
        ),
      })}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: false,
        onChange: onPageChange,
      }}
    />
  );
});

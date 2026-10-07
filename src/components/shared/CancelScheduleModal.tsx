import React, { useState, useEffect } from 'react';
import { Modal, Input } from 'antd';
import { X, CalendarOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@mui/material';

export interface CancelScheduleModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
  title?: string;
  scheduleTitle?: string;
  tone?: 'neutral' | 'danger';
}

const TONE_STYLE = {
  neutral: {
    icon: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    focus: 'focus:border-slate-500 hover:border-slate-400',
    confirm:
      '!bg-gradient-to-br !from-slate-400 !to-slate-500 hover:!from-slate-500 hover:!to-slate-600 hover:!brightness-110 !shadow-sm !shadow-slate-400/30 hover:!shadow-md hover:!shadow-slate-400/40',
  },
  danger: {
    icon: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50',
    focus: 'focus:border-rose-500 hover:border-rose-400',
    confirm:
      '!bg-gradient-to-b !from-rose-400 !to-rose-500 hover:!from-rose-500 hover:!to-rose-600 !shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)]',
  },
} as const;

export const CancelScheduleModal: React.FC<CancelScheduleModalProps> = ({
  open,
  onCancel,
  onConfirm,
  loading = false,
  title,
  scheduleTitle,
  tone = 'neutral',
}) => {
  const toneStyle = TONE_STYLE[tone];
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open]);

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t('personal_calendar.cancel_reason_required') || 'Vui lòng nhập lý do từ chối!');
      return;
    }
    onConfirm(trimmed);
  };

  const baseTitle = title || t('personal_calendar.cancel_confirm_title_short') || 'Hủy lịch làm việc';
  const dialogTitle = scheduleTitle ? `${baseTitle} “${scheduleTitle}”` : baseTitle;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      // Opened from MUI detail modals (z-index 1300); antd's default 1000 would sit behind them.
      zIndex={1400}
      mask={{ closable: false }}
      keyboard={false}
      width={480}
      destroyOnHidden
      closeIcon={<X size={18} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />}
      className="[&_.ant-modal-content]:!p-6 [&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border [&_.ant-modal-content]:!border-slate-100 dark:[&_.ant-modal-content]:!border-slate-800 [&_.ant-modal-content]:!bg-white dark:[&_.ant-modal-content]:!bg-slate-900 [&_.ant-modal-content]:!shadow-2xl"
    >
      <div className="flex flex-col gap-4.5">
        {/* Header section */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-11 h-11 rounded-2xl border shrink-0 shadow-xs ${toneStyle.icon}`}>
            <CalendarOff size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
              {dialogTitle}
            </h3>
            <p className="text-13 text-slate-500 dark:text-slate-400">
              {t('personal_calendar.cancel_confirm_sub_hint') || 'Vui lòng nhập lý do từ chối bên dưới.'}
            </p>
          </div>
        </div>

        {/* Reason Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13.5px] font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
            <span>
              {t('personal_calendar.cancel_reason_label') || 'Nội dung / Lý do từ chối'} <span className="text-rose-500">*</span>
            </span>
          </label>
          <Input.TextArea
            rows={3.5}
            maxLength={500}
            showCount
            placeholder={t('personal_calendar.cancel_reason_placeholder') || 'Nhập lý do từ chối lịch làm việc...'}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error && e.target.value.trim()) {
                setError('');
              }
            }}
            className={`!rounded-2xl !text-[13.5px] font-normal border-slate-200 dark:border-slate-700 dark:!bg-slate-900 dark:!text-slate-100 ${toneStyle.focus} transition-all duration-200`}
            // showCount wraps the textarea in an affix wrapper: pad the textarea itself, not the wrapper (padding doubled).
            styles={{ textarea: { padding: '10px 14px' } }}
          />
          {error && <span className="text-xs font-medium text-rose-500 animate-fadeIn mt-0.5">{error}</span>}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
            className="!h-10 !px-5 !rounded-full !border-slate-300 dark:!border-slate-700 !text-slate-700 dark:!text-slate-200 text-[13.5px] font-medium"
            sx={{ textTransform: 'none' }}
          >
            {t('personal_calendar.cancel_cancel', { defaultValue: 'Hủy' })}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            className={`!h-10 !px-5.5 !rounded-full !text-white text-[13.5px] font-semibold transition-all hover:-translate-y-0.5 ${toneStyle.confirm}`}
            sx={{ textTransform: 'none' }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>{t('common.processing') || 'Đang xử lý...'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CalendarOff size={16} />
                <span>{t('personal_calendar.cancel_ok') || 'Xác nhận từ chối'}</span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

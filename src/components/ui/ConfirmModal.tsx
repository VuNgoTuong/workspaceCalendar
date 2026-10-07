import React from 'react';
import { Modal } from 'antd';
import { X, Save, AlertTriangle, Trash2, CheckCircle2, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/helpers';

export type ConfirmVariant = 'draft' | 'info' | 'warning' | 'danger' | 'success';

export interface ConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onClose?: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmText: string;
  cancelText: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
  confirmIcon?: React.ReactNode;
  loading?: boolean;
  zIndex?: number;
  uppercaseTitle?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onCancel,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'draft',
  icon,
  confirmIcon,
  loading = false,
  zIndex = 1400,
  uppercaseTitle = true,
}) => {
  const renderIcon = () => {
    if (icon) return icon;
    switch (variant) {
      case 'draft':
        return <Save size={20} />;
      case 'info':
        return <HelpCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'danger':
        return <Trash2 size={20} />;
      case 'success':
        return <CheckCircle2 size={20} />;
      default:
        return <Save size={20} />;
    }
  };

  const badgeStyle = () => {
    switch (variant) {
      case 'draft':
      case 'info':
        return 'bg-blue-50 dark:bg-blue-950/50 text-[#00529C] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50';
      case 'danger':
        return 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50';
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50';
      default:
        return 'bg-blue-50 dark:bg-blue-950/50 text-[#00529C] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50';
    }
  };

  const confirmBtnStyle = () => {
    switch (variant) {
      case 'danger':
        return 'bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)] text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      case 'success':
        return 'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.3)] text-white';
      case 'draft':
      case 'info':
      default:
        return 'bg-gradient-to-r from-[#0066C7] via-[#0082E6] to-[#0066C7] hover:brightness-110 shadow-sm shadow-[#0066C7]/25 hover:shadow-md hover:shadow-[#0066C7]/35 text-white';
    }
  };

  const handleClose = onClose ?? onCancel;

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      title={null}
      closeIcon={null}
      centered
      width={440}
      zIndex={zIndex}
      mask={{ closable: false }}
      keyboard={false}
      styles={{ body: { padding: 0 }, container: { padding: 0 } }}
      className="compact-confirm-modal"
    >
      <div className="p-5 relative bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3.5 pr-8">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', badgeStyle())}>
            {renderIcon()}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h3
              className={cn(
                'text-24 font-bold text-slate-900 dark:text-slate-100 leading-snug',
                uppercaseTitle && 'uppercase'
              )}
            >
              {title}
            </h3>
            <p className="mt-1.5 text-13.5 text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-9.5 px-4.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-13 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'relative h-9.5 px-5 rounded-full text-13 font-semibold hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 before:absolute before:-top-2 before:-bottom-2 before:inset-x-0',
              confirmBtnStyle()
            )}
          >
            {loading ? (
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              confirmIcon || null
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

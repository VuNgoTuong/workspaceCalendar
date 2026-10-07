import React from 'react';
import { Dialog, Button, CircularProgress } from '@mui/material';
import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface FormModalProps {
  open: boolean;
  onCancel: () => void;
  width?: number | string;
  centered?: boolean;
  top?: number;
  children: React.ReactNode;
}

export const FormModal: React.FC<FormModalProps> = ({ open, onCancel, width, centered, top = 32, children }) => (
  <Dialog
    open={open}
    onClose={(_e, reason) => {
      if (reason === 'backdropClick') return;
      onCancel();
    }}
    scroll="paper"
    disableEnforceFocus
    sx={{ '& .MuiDialog-container': { alignItems: centered ? 'center' : 'flex-start' } }}
    slotProps={{
      paper: {
        className: 'form-modal-custom overflow-hidden !bg-white dark:!bg-[#0b1329] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-2xl',
        style: {
          width: typeof width === 'number' ? `${width}px` : width,
          maxWidth: '95vw',
          margin: centered ? undefined : `${Number(top) || 32}px auto`,
          borderRadius: 12,
        },
      },
    }}
  >
    <div
      className="flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#0b1329]"
      style={{
        maxHeight: centered
          ? 'calc(100vh - 64px)'
          : `calc(100vh - ${(Number(top) || 32) * 2}px)`,
      }}
    >
      {children}
    </div>
  </Dialog>
);

interface FormModalHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  iconClassName?: string;
  /** Overrides the header's background (defaults to plain white/slate-900). Use to tint the header, e.g. by status. */
  className?: string;
  /** Optional content rendered between the title block and the close button, e.g. a short tagline. */
  extra?: React.ReactNode;
  onClose: () => void;
}

export const FormModalHeader: React.FC<FormModalHeaderProps> = ({ title, subtitle, icon, iconClassName, className, extra, onClose }) => (
  <div
    className={cn(
      'flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 transition-colors duration-300',
      className ?? 'bg-white dark:bg-slate-900'
    )}
  >
    <div className="flex items-center gap-3.5 min-w-0">
      {icon && (
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white',
            iconClassName ?? 'bg-gradient-to-br from-blue-500 via-[#00529C] to-indigo-600 shadow-md shadow-blue-500/20'
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5 leading-tight">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>}
      </div>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      {extra}
      {extra && <span aria-hidden className="h-6 w-px bg-slate-200 dark:bg-slate-700" />}
      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
      >
        <X size={18} />
      </button>
    </div>
  </div>
);

interface FormModalBodyProps {
  className?: string;
  children: React.ReactNode;
}

export const FormModalBody: React.FC<FormModalBodyProps> = ({ className, children }) => (
  <div className={`flex flex-col gap-4 bg-slate-50 dark:bg-[#070c18] px-4 py-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0 ${className || ''}`}>{children}</div>
);

interface FormSectionCardProps {
  number: number;
  title: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  highlight?: boolean;
  badge?: React.ReactNode;
  surfaceClassName?: string;
  titleClassName?: string;
}

export const FormSectionCard: React.FC<FormSectionCardProps> = ({ number, title, icon, className, children, highlight, badge, surfaceClassName, titleClassName }) => (
  <div
    className={`relative flex h-full flex-col rounded-lg border p-4 transition-all duration-200 ${
      highlight
        ? 'border-[#00529C]/30 dark:border-blue-500/30 bg-gradient-to-br from-blue-50/70 via-white to-white dark:from-blue-950/25 dark:via-slate-900 dark:to-slate-900 shadow-md ring-1 ring-[#00529C]/10 dark:ring-blue-500/10 hover:border-[#00529C]/50 hover:shadow-lg'
        : surfaceClassName ?? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-[#00529C]/40 hover:shadow-md'
    } ${className || ''}`}
  >
    {highlight && <span className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-[#00529C] dark:bg-blue-500" />}
    <div className={`mb-3 flex items-center justify-between gap-2 border-b pb-2 ${highlight ? 'border-[#00529C]/15 dark:border-blue-500/20 pl-2.5' : 'border-slate-100 dark:border-slate-800'}`}>
      <div className="flex items-center gap-2">
        {icon && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50/90 dark:bg-blue-950/40 text-[#00529C] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
            {icon}
          </div>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className={`text-base font-semibold transition-colors ${highlight ? 'text-[#00529C] dark:text-blue-400' : titleClassName ?? 'text-slate-800 dark:text-slate-200'}`}>{number}.</span>
          <span className={`text-base font-semibold transition-colors ${highlight ? 'text-[#00529C] dark:text-blue-400' : titleClassName ?? 'text-slate-800 dark:text-slate-200'}`}>{title}</span>
        </div>
      </div>
      {badge && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#00529C]/10 dark:bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-[#00529C] dark:text-blue-400">
          {badge}
        </span>
      )}
    </div>
    <div className={`flex-1 flex flex-col ${highlight ? 'pl-2.5' : ''}`}>{children}</div>
  </div>
);

export const formFieldLabel = (text: string) => (
  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{text}</span>
);

interface ReadOnlyFieldProps {
  label: string;
  value?: React.ReactNode;
}

export const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({ label, value }) => (
  <div className="flex min-w-0 flex-col gap-1 h-full">
    {formFieldLabel(label)}
    <div className="min-w-0 flex-1 text-13.5 font-medium text-slate-800 dark:text-slate-100">
      {value || <span className="font-normal italic text-slate-400 dark:text-slate-500">—</span>}
    </div>
  </div>
);

export const formInputClass =
  'h-10 rounded-lg border-slate-200 dark:border-slate-700 hover:border-[#00529C] focus:border-[#00529C]';

interface FormModalFooterProps {
  onCancel: () => void;
  cancelText: string;
  cancelIcon?: React.ReactNode;
  submitText: string;
  submitIcon?: React.ReactNode;
  loading?: boolean;
  htmlType?: 'submit' | 'button';
  onSubmit?: () => void;
  className?: string;
}

export const FormModalFooter: React.FC<FormModalFooterProps> = ({
  onCancel,
  cancelText,
  cancelIcon,
  submitText,
  submitIcon,
  loading,
  htmlType = 'submit',
  onSubmit,
  className,
}) => (
  <div
    className={cn(
      'flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 px-5 py-3 transition-colors duration-300',
      className ?? 'bg-white dark:bg-slate-900'
    )}
  >
    <Button
      variant="outlined"
      onClick={onCancel}
      startIcon={cancelIcon}
      className="relative h-10 w-[140px] !rounded-full !border-slate-300 dark:!border-slate-700 text-13.5 font-semibold !text-slate-700 dark:!text-slate-200 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:!border-[#00529C] dark:hover:!border-blue-400 hover:!text-[#00529C] dark:hover:!text-blue-400 hover:!bg-blue-50/50 dark:hover:!bg-slate-800 active:scale-[0.98] before:absolute before:-top-2 before:-bottom-2 before:inset-x-0"
      sx={{ textTransform: 'none' }}
    >
      {cancelText}
    </Button>
    <Button
      variant="contained"
      disableElevation
      type={htmlType}
      onClick={onSubmit}
      disabled={loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : submitIcon}
      className="relative h-10 w-[140px] !rounded-full border-0 !bg-gradient-to-r !from-[#0066C7] !via-[#0082E6] !to-[#0066C7] !text-white text-13.5 font-semibold shadow-md shadow-blue-500/25 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:!from-[#0072DF] hover:!to-[#0072DF] hover:shadow-lg hover:shadow-blue-500/35 active:scale-[0.98] before:absolute before:-top-2 before:-bottom-2 before:inset-x-0"
      sx={{ textTransform: 'none' }}
    >
      {submitText}
    </Button>
  </div>
);

import React from 'react';
import { IconButton, CircularProgress } from '@mui/material';
import { Tooltip } from './Tooltip';
import { Pencil, Trash2, Copy, NotebookTabs, Key, KeyRound, Undo2, RotateCcw, CalendarOff, CalendarX2, CalendarCheck2, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ActionButtonType = 'edit' | 'delete' | 'duplicate' | 'info' | 'permissions' | 'revoke' | 'cancel' | 'approve' | 'reject' | 'resubmit' | 'reset-password';

interface ActionButtonProps {
  type: ActionButtonType;
  onClick?: (e: React.MouseEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  tooltip?: string;
  size?: 'small' | 'middle' | 'large';
}

const SIZE_MAP: Record<NonNullable<ActionButtonProps['size']>, 'small' | 'medium' | 'large'> = {
  small: 'small',
  middle: 'medium',
  large: 'large',
};

const ACTION_CONFIG: Record<ActionButtonType, { Icon: LucideIcon; colorClass: string; tooltipKey: string }> = {
  edit: { Icon: Pencil, colorClass: 'action-btn-edit', tooltipKey: 'common.action_edit' },
  delete: { Icon: Trash2, colorClass: 'action-btn-delete', tooltipKey: 'common.action_delete' },
  duplicate: { Icon: Copy, colorClass: 'action-btn-duplicate', tooltipKey: 'common.action_duplicate' },
  info: { Icon: NotebookTabs, colorClass: 'action-btn-info', tooltipKey: 'common.action_detail' },
  permissions: { Icon: Key, colorClass: 'action-btn-permissions', tooltipKey: 'common.action_permissions' },
  revoke: { Icon: Undo2, colorClass: 'action-btn-duplicate', tooltipKey: 'common.action_revoke' },
  cancel: { Icon: CalendarOff, colorClass: 'action-btn-cancel', tooltipKey: 'common.action_cancel' },
  approve: { Icon: CalendarCheck2, colorClass: 'action-btn-approve', tooltipKey: 'schedule_approval.action_approve' },
  reject: { Icon: CalendarX2, colorClass: 'action-btn-reject', tooltipKey: 'schedule_approval.action_reject' },
  resubmit: { Icon: RotateCcw, colorClass: 'action-btn-edit', tooltipKey: 'leadership_schedule.action_resubmit' },
  'reset-password': { Icon: KeyRound, colorClass: 'action-btn-reset-password', tooltipKey: 'common.action_reset_password' },
};

export const ActionButton = React.memo(React.forwardRef<HTMLButtonElement, ActionButtonProps>(({
  type,
  onClick,
  loading,
  disabled,
  tooltip,
  size = 'middle',
}, ref) => {
  const { t } = useTranslation();
  const { Icon, colorClass, tooltipKey } = ACTION_CONFIG[type];

  const buttonContent = (
    <IconButton
      ref={ref}
      size={SIZE_MAP[size]}
      disabled={disabled || loading}
      onClick={onClick}
      className={`flex items-center justify-center border-0 cursor-pointer rounded-full transition-all duration-200 w-7.5 h-7.5 min-w-[30px] ${colorClass}`}
    >
      {loading ? <CircularProgress size={16} color="inherit" /> : <Icon size={16} strokeWidth={1.5} />}
    </IconButton>
  );

  const titleText = tooltip !== undefined ? tooltip : t(tooltipKey);

  if (titleText) {
    return (
      <Tooltip title={titleText} enterDelay={300}>
        <span className="inline-flex">{buttonContent}</span>
      </Tooltip>
    );
  }

  return <span className="inline-flex">{buttonContent}</span>;
}));

ActionButton.displayName = 'ActionButton';

export default ActionButton;

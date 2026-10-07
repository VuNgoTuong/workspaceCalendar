import React from 'react';
import { SpeedDial, SpeedDialAction } from '@mui/material';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QuickActionsProps {
  speedDialOpen: boolean;
  onOpenChange: (open: boolean) => void;
  actions: Array<{
    key: string;
    icon: React.ComponentType<{ size?: number | string }>;
    labelKey: string;
  }>;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  speedDialOpen,
  onOpenChange,
  actions,
}) => {
  const { t } = useTranslation();

  return (
    <SpeedDial
      ariaLabel="quick-create"
      className="!fixed !bottom-6 !right-6"
      icon={<Plus />}
      open={speedDialOpen}
      onOpen={() => onOpenChange(true)}
      onClose={() => onOpenChange(false)}
      FabProps={{
        className:
          '!w-14 !h-14 !bg-[#00529C] hover:!bg-[#003e75] !shadow-[0_8px_24px_-4px_rgba(0,82,156,0.4)] !scale-75 hover:!scale-100 !transition-transform !duration-200',
      }}
    >
      {actions.map((action) => (
        <SpeedDialAction
          key={action.key}
          icon={<action.icon size={18} />}
          title={t(action.labelKey)}
          onClick={() => onOpenChange(false)}
        />
      ))}
    </SpeedDial>
  );
};

export default QuickActions;

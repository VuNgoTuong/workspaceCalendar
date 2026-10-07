import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../../../components/ui/Tooltip';

interface FilterResetButtonProps {
  onClick: () => void;
  label?: string;
}

export const FilterResetButton: React.FC<FilterResetButtonProps> = ({ onClick, label }) => {
  const { t } = useTranslation();
  const text = label ?? t('common.reset_filters', { defaultValue: 'Đặt lại bộ lọc' });

  return (
    <Tooltip title={text} placement="top" arrow>
      <button
        type="button"
        onClick={onClick}
        aria-label={text}
        className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-transparent text-slate-500 dark:text-slate-400 cursor-pointer transition-all hover:text-[#00529C] hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 shrink-0"
      >
        <RotateCcw size={15} />
      </button>
    </Tooltip>
  );
};

export default FilterResetButton;

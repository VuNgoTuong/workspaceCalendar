import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/helpers';
import { Filter, ChevronDown, RotateCcw } from 'lucide-react';

export interface FilterPanelProps {
  activeFiltersCount?: number;
  onReset?: () => void;
  children: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  activeFiltersCount = 0,
  onReset,
  children,
  className,
  defaultExpanded = false,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const togglePanel = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={cn(
        'w-full bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.015)]',
        isExpanded ? 'p-5' : 'p-3 px-4.5',
        className
      )}
    >
      {/* Header bar / Toggle bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div
          onClick={togglePanel}
          className="flex items-center gap-2.5 cursor-pointer select-none group text-slate-700 dark:text-slate-300"
        >
          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 text-slate-500 dark:text-slate-400 group-hover:text-[#00529C] dark:group-hover:text-[#60a5fa] transition-colors">
            <Filter size={16} strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold tracking-wide group-hover:text-[#00529C] dark:group-hover:text-[#60a5fa] transition-colors">
            {t('common.filter_title')}
          </span>

          {/* Active filter count badge */}
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-11 font-bold bg-[#00529C] dark:bg-blue-900/60 text-white rounded-full animate-pulse-slow">
              {activeFiltersCount}
            </span>
          )}

          <ChevronDown
            size={16}
            className={cn(
              'text-slate-400 transition-transform duration-300 ml-1',
              isExpanded && 'rotate-180'
            )}
          />
        </div>

        {/* Reset button always visible if active filters exist & panel is open or closed */}
        {activeFiltersCount > 0 && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <RotateCcw size={12} strokeWidth={2.5} />
            {t('common.filter_reset')}
          </button>
        )}
      </div>

      {/* Expandable Form section */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          isExpanded
            ? 'mt-5 max-h-[1000px] opacity-100 visible'
            : 'max-h-0 opacity-0 invisible overflow-hidden'
        )}
      >
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4.5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;

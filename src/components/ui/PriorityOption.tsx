import type { ReactNode } from 'react';
import { ChevronUp, ChevronDown, Clock, Layers, TriangleAlert } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface PriorityConfigItem {
  textClass: string;
  iconClass: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}

const PRIORITY_CONFIG: Record<string, PriorityConfigItem> = {
  urgent: { textClass: '!text-red-600 dark:!text-red-400', iconClass: 'text-red-500 dark:text-red-400', icon: TriangleAlert },
  high: { textClass: '!text-slate-700 dark:!text-slate-200', iconClass: 'text-amber-500 dark:text-amber-400', icon: ChevronUp },
  normal: { textClass: '!text-slate-700 dark:!text-slate-200', iconClass: 'text-[#1F78D6] dark:text-blue-400', icon: Clock },
  low: { textClass: '!text-slate-500 dark:!text-slate-400', iconClass: 'text-slate-400 dark:text-slate-500', icon: ChevronDown },
  all: { textClass: '!text-slate-600 dark:!text-slate-300', iconClass: 'text-slate-400 dark:text-slate-500', icon: Layers },
};

interface PriorityOptionValue {
  value: string;
  label: ReactNode;
}

export function withPriorityColor<T extends PriorityOptionValue>(
  options: T[]
): (Omit<T, 'label'> & { label: ReactNode })[] {
  return options.map((opt) => {
    const config = PRIORITY_CONFIG[opt.value];
    if (!config) {
      return opt;
    }
    const IconComponent = config.icon;
    return {
      ...opt,
      label: (
        <span className={cn('inline-flex items-center gap-2 font-normal', config.textClass)}>
          <IconComponent size={14} strokeWidth={2} className={cn('shrink-0', config.iconClass)} />
          <span className="truncate">{opt.label}</span>
        </span>
      ),
    };
  });
}

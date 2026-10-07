import React from 'react';

interface StatItem {
  key: string;
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  theme: {
    soft: string;
  };
  onClick?: () => void;
}

interface DashboardInsightsProps {
  statItems: StatItem[];
}

export const DashboardInsights: React.FC<DashboardInsightsProps> = ({ statItems }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClick}
          className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/30 hover:border-slate-200 dark:hover:border-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-all duration-200"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.theme.soft}`}>
              {item.icon}
            </div>
            <div className="min-w-0 text-left">
              <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
                {item.label}
              </div>
              <div className="text-[15px] font-semibold text-slate-800 dark:text-white leading-tight">
                {item.value}{' '}
                <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                  {item.unit}
                </span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default DashboardInsights;

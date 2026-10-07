import React from 'react';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { PersonAvatar } from './PersonAvatar';

export interface ParticipantsTooltipItem {
  id?: string | null;
  name?: string | null;
  code?: string | null;
  avatarUrl?: string | null;
}

export interface ParticipantsTooltipProps {
  participants?: ParticipantsTooltipItem[] | null;
  children: React.ReactElement;
}

export const ParticipantsTooltip: React.FC<ParticipantsTooltipProps> = ({ participants, children }) => {
  const { t } = useTranslation();
  const list = participants ?? [];

  return (
    <Tooltip
      color="white"
      placement="bottomRight"
      styles={{ container: { padding: 0, minHeight: 0, borderRadius: 12, boxShadow: '0 10px 28px -8px rgba(15,35,65,0.22), 0 2px 6px -2px rgba(15,35,65,0.08)' } }}
      title={
        list.length > 0 ? (
          <div className="w-[210px] text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-12 font-semibold text-slate-800 dark:text-slate-100">
                {t('common.participant_dialog_title')}
              </span>
              <span className="ml-auto min-w-[20px] px-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[10.5px] font-bold text-center text-[#00529C] dark:text-blue-300">
                {list.length}
              </span>
            </div>
            <div className="slim-scroll flex flex-col max-h-[240px] overflow-y-auto p-0.5">
              {list.map((p, idx) => (
                <div key={p.id || idx} className="flex items-center gap-2 px-2 py-1 rounded-md">
                  <PersonAvatar name={p.name} avatarUrl={p.avatarUrl} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[12.5px] font-medium text-slate-800 dark:text-slate-100">{p.name || p.code}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null
      }
    >
      {children}
    </Tooltip>
  );
};

export default ParticipantsTooltip;

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Mail, Building2, Briefcase, Search, X } from 'lucide-react';
import { FormModal, FormModalHeader, FormModalBody } from '../../../components/ui/FormModal';
import { cn, resolveAttachmentUrl } from '../../../utils/helpers';

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/đ/g, 'd');

export type ParticipantResponseStatus = 'confirmed' | 'pending' | 'rejected';

export interface ParticipantEntry {
  id: string;
  code?: string | null;
  name: string;
  email?: string | null;
  department?: string | null;
  position?: string | null;
  avatarUrl?: string | null;
  rejectReason?: string | null;
}

const initialsOf = (name?: string) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

export interface ParticipantDialogProps {
  open: boolean;
  onClose: () => void;
  participants: Record<ParticipantResponseStatus, ParticipantEntry[]> | null;
  title?: string;
}

export const ParticipantDialog: React.FC<ParticipantDialogProps> = ({ open, onClose, participants, title }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ParticipantResponseStatus>('confirmed');
  const [search, setSearch] = useState('');
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setTab('confirmed');
      setSearch('');
      setImgErrorMap({});
    }
  }, [open]);

  const list = useMemo(() => {
    const base = participants?.[tab] ?? [];
    const q = normalize(search.trim());
    if (!q) return base;
    return base.filter((p) =>
      [p.name, p.code, p.department, p.position, p.email].some((v) => v && normalize(v).includes(q))
    );
  }, [participants, tab, search]);

  if (!participants) return null;

  const statOptions: { key: ParticipantResponseStatus; labelKey: string }[] = [
    { key: 'confirmed', labelKey: 'common.participant_confirmed' },
    { key: 'pending', labelKey: 'common.participant_pending' },
    { key: 'rejected', labelKey: 'common.participant_rejected' },
  ];

  return (
    <FormModal open={open} onCancel={onClose} width={720} centered>
      <FormModalHeader
        title={t('common.participant_dialog_title')}
        subtitle={title}
        onClose={onClose}
      />

      <FormModalBody className="!p-6 !gap-4">
        {/* Luxury Apple/Vercel Style Floating White Pill Tab Bar */}
        <div className="flex justify-start">
          <div className="relative inline-flex items-center p-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50">
            {statOptions.map((s) => {
              const count = participants[s.key].length;
              const isActive = tab === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setTab(s.key)}
                  className={cn(
                    'relative z-10 flex items-center gap-2 h-8.5 px-4 rounded-full text-13 transition-colors cursor-pointer select-none',
                    isActive
                      ? 'text-[#00529C] dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activePillTab"
                      className="absolute inset-0 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-700/80"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 truncate">{t(s.labelKey)}</span>
                  <span
                    className={cn(
                      'relative z-10 px-2 py-0.2 text-11 font-bold rounded-full min-w-[18px] text-center transition-colors',
                      isActive
                        ? 'bg-blue-50 text-[#00529C] dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-slate-200/70 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.participant_search_placeholder')}
            className="w-full h-9.5 pl-9.5 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-13 placeholder:text-slate-400 focus:border-[#00529C] focus:outline-none focus:ring-1 focus:ring-[#00529C]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Participant List with Fixed Minimum Height */}
        <div className="min-h-[360px] flex flex-col">
          {list.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[360px] text-center text-13 text-slate-400 dark:text-slate-500">
              {search.trim() ? t('common.participant_search_empty') : t('common.participant_empty')}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {list.map((p) => {
                const displayName = p.name?.trim() || p.code || p.email || t('common.participant_unnamed') || 'Người tham dự';

                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
                  >
                    {/* Avatar */}
                    {p.avatarUrl && !imgErrorMap[p.id] ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        src={resolveAttachmentUrl(p.avatarUrl)}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        onError={() => setImgErrorMap((prev) => ({ ...prev, [p.id]: true }))}
                        className="h-9.5 w-9.5 shrink-0 rounded-full object-contain bg-white border border-slate-200 dark:border-slate-700 shadow-2xs"
                      />
                    ) : (
                      <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-11.5 font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {initialsOf(displayName)}
                      </div>
                    )}

                    {/* Details with smaller font scale */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-13 font-semibold text-slate-800 dark:text-slate-100">{displayName}</span>
                        {p.code && (
                          <span className="text-[10.5px] font-mono font-medium text-[#00529C] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 px-1.5 py-0.2 rounded">
                            {p.code}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-11 font-normal text-slate-500 dark:text-slate-400">
                        {p.position && (
                          <span className="inline-flex items-center gap-1">
                            <Briefcase size={11} className="shrink-0 text-slate-400" />
                            <span>{p.position}</span>
                          </span>
                        )}
                        {p.department && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={11} className="shrink-0 text-slate-400" />
                            <span>{p.department}</span>
                          </span>
                        )}
                        {p.email && (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Mail size={11} className="shrink-0 text-slate-400" />
                            <span>{p.email}</span>
                          </span>
                        )}
                      </div>

                      {(tab === 'rejected' || p.rejectReason) && (
                        <div className="mt-1.5 rounded-lg border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/30 px-2.5 py-1.5 text-11">
                          <span className="font-semibold text-rose-700 dark:text-rose-300">
                            {t('common.participant_reject_reason_label', { defaultValue: 'Lý do từ chối' })}:
                          </span>{' '}
                          <span className="text-slate-700 dark:text-slate-300">
                            {p.rejectReason || (
                              <span className="italic text-slate-400 dark:text-slate-500">
                                {t('common.reason_not_provided', { defaultValue: 'Không có lý do được cung cấp' })}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FormModalBody>
    </FormModal>
  );
};

export default ParticipantDialog;

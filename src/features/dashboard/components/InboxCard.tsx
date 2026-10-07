import React, { useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { motion } from 'motion/react';
import { AlarmClock, AlertCircle, CalendarCheck2, CalendarX2, FileCheck, Loader2, Mail, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApprovalRequest } from '../../work-schedule/PheDuyetLich/types';
import type { MeetingInvitation } from '../../work-schedule/LichMoiThamDu/types';
import { Tooltip } from '../../../components/ui';
import { cn } from '../../../utils/helpers';
import { SPRING } from '../homeTheme';

interface InboxItemBase {
  id: string;
  title: string;
  start: Dayjs;
  end: Dayjs;
  who: string;
  whoAvatar?: string;
  location: string;
  typeName?: string;
  urgent: boolean;
}

export type InboxItem =
  | (InboxItemBase & { kind: 'approval'; raw: ApprovalRequest })
  | (InboxItemBase & { kind: 'invitation'; raw: MeetingInvitation });

export type InboxKind = InboxItem['kind'];

const DECLINE_BTN =
  'bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)]';

export const KIND_META = {
  approval: {
    labelKey: 'dashboard_home.inbox_tag_approval',
    icon: FileCheck,
    chip: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300',
    tile: 'bg-gradient-to-b from-emerald-50 to-emerald-100/60 dark:from-emerald-950/50 dark:to-emerald-900/30 ring-emerald-100 dark:ring-emerald-900/50',
    tileInk: 'text-emerald-700 dark:text-emerald-300',
    restBorder: 'border-emerald-200/70 dark:border-emerald-900/50',
    hover: 'hover:border-emerald-200/80 dark:hover:border-emerald-800/50 hover:shadow-[0_10px_28px_-12px_rgba(16,185,129,0.35)]',
    glow: 'bg-[radial-gradient(130%_140%_at_100%_0%,rgba(52,211,153,0.2),rgba(236,253,245,0.55)_45%,transparent_75%)] dark:bg-[radial-gradient(130%_140%_at_100%_0%,rgba(16,185,129,0.16),transparent_70%)]',
    primary:
      'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.3)]',
    primaryIcon: CalendarCheck2,
    primaryKey: 'dashboard_home.inbox_quick_approve',
  },
  invitation: {
    labelKey: 'dashboard_home.inbox_tag_invitation',
    icon: Mail,
    chip: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300',
    tile: 'bg-amber-50/60 dark:bg-amber-950/30 ring-amber-100/80 dark:ring-amber-900/40',
    tileInk: 'text-amber-700 dark:text-amber-300',
    restBorder: 'border-amber-200/70 dark:border-amber-900/50',
    hover: 'hover:border-amber-100 dark:hover:border-amber-900/50 hover:shadow-[0_10px_28px_-14px_rgba(245,158,11,0.22)]',
    glow: 'bg-[radial-gradient(90%_120%_at_100%_0%,rgba(251,191,36,0.1),rgba(255,251,235,0.35)_40%,transparent_70%)] dark:bg-[radial-gradient(90%_120%_at_100%_0%,rgba(245,158,11,0.08),transparent_65%)]',
    primary:
      'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.3)]',
    primaryIcon: CalendarCheck2,
    primaryKey: 'dashboard_home.inbox_join',
  },
} as const;

const toStart = (date: string, time: string) => dayjs(`${date}T${time || '00:00'}`);

export const toInboxItems = (
  approvalsPage: { items?: ApprovalRequest[] } | undefined,
  invitationsPage: { items?: MeetingInvitation[] } | undefined,
  canApprove: boolean
): InboxItem[] => {
  const approvals: InboxItem[] = canApprove
    ? (approvalsPage?.items ?? []).map((r) => ({
        kind: 'approval' as const,
        id: r.id,
        title: r.title,
        start: toStart(r.date, r.startTime),
        end: toStart(r.date, r.endTime),
        who: r.requester?.name ?? '',
        whoAvatar: r.requester?.avatarUrl,
        location: r.location,
        typeName: r.scheduleTypeName,
        urgent: r.priority === 'urgent',
        raw: r,
      }))
    : [];
  const invitations: InboxItem[] = (invitationsPage?.items ?? []).map((i) => ({
    kind: 'invitation' as const,
    id: i.id,
    title: i.title,
    start: toStart(i.date, i.startTime),
    end: toStart(i.date, i.endTime),
    who: i.organizer?.name ?? '',
    whoAvatar: i.organizer?.avatarUrl || undefined,
    location: i.location,
    typeName: i.scheduleTypeName,
    urgent: i.priority === 'urgent',
    raw: i,
  }));
  return [...approvals, ...invitations];
};

/** Tiny avatar for the "who" line; falls back to the name's initial when there's no (or a broken) photo. */
const WhoAvatar: React.FC<{ src?: string; name: string; size?: number }> = ({ src, name, size = 16 }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full object-contain bg-white ring-1 ring-slate-200/80 dark:ring-slate-700/80"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = name.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden
      className="shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br from-[#00529C] to-blue-500 text-white font-semibold leading-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
    >
      {initial}
    </span>
  );
};

export const byUrgencyThenStart = (a: InboxItem, b: InboxItem) =>
  Number(b.urgent) - Number(a.urgent) || a.start.valueOf() - b.start.valueOf();

export interface InboxCardHandlers {
  busyId: string | null;
  onPrimary: (item: InboxItem) => void;
  onReject: (item: InboxItem) => void;
  onOpen: (item: InboxItem) => void;
}

interface InboxCardProps extends InboxCardHandlers {
  item: InboxItem;
  index: number;
  compact?: boolean;
}

export const InboxCard: React.FC<InboxCardProps> = ({ item, index, busyId, onPrimary, onReject, onOpen, compact }) => {
  const { t } = useTranslation();
  const meta = KIND_META[item.kind];
  const KindIcon = meta.icon;
  const PrimaryIcon = meta.primaryIcon;
  const isBusy = busyId === item.id;

  const now = dayjs();
  const badge = item.start.isSame(now, 'day')
    ? { text: t('dashboard_home.inbox_due_today'), className: 'text-rose-600 dark:text-rose-400', icon: AlarmClock }
    : item.start.isSame(now.add(1, 'day'), 'day')
    ? { text: t('dashboard_home.inbox_due_tomorrow'), className: 'text-amber-600 dark:text-amber-400', icon: AlarmClock }
    : {
        text: t(item.kind === 'approval' ? 'dashboard_home.waiting_approval' : 'dashboard_home.inbox_waiting_reply'),
        className: 'text-slate-400 dark:text-slate-500',
        icon: null,
      };
  const BadgeIcon = badge.icon;
  const isLive = !now.isBefore(item.start) && now.isBefore(item.end);

  if (compact) {
    return (
      <motion.li
        onClick={() => onOpen(item)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.2, delay: index * 0.02 } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        className={cn(
          'group relative isolate flex items-center gap-3.5 rounded-xl border cursor-pointer border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 pr-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-200 [content-visibility:auto] [contain-intrinsic-size:auto_78px]',
          meta.hover
        )}
      >
        <span
          aria-hidden
          className={cn('pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100', meta.glow)}
        />
        <Tooltip title={t(meta.labelKey)} placement="top">
          <span className={cn('flex flex-col items-center justify-center w-14 h-[52px] rounded-xl ring-1 ring-inset shrink-0 tabular-nums', meta.tile)}>
            <span className={cn('text-14 font-semibold leading-none', meta.tileInk)}>{item.start.format('HH:mm')}</span>
            <span className="mt-1.5 text-10.5 leading-none text-slate-400 dark:text-slate-500">{item.end.format('HH:mm')}</span>
          </span>
        </Tooltip>

        <button type="button" onClick={(e) => {
          e.stopPropagation();
          onOpen(item);
        }} className="flex-1 min-w-0 text-left cursor-pointer">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-13.5 font-semibold text-slate-800 dark:text-slate-100 group-hover:text-[#00529C] dark:group-hover:text-blue-400 transition-colors">
              {item.title || t('dashboard_home.untitled')}
            </span>
            {isLive ? (
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-px rounded-md text-10.5 font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-60 animate-ping" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </span>
                {t('dashboard_home.ongoing')}
              </span>
            ) : item.urgent ? (
              <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-px rounded-md text-10.5 font-medium bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <AlertCircle size={10} />
                {t('dashboard_home.urgent')}
              </span>
            ) : item.typeName ? (
              <span className="shrink-0 px-1.5 py-px rounded-md text-10.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {item.typeName}
              </span>
            ) : null}
          </span>
          <span className="mt-1.5 flex items-center gap-1.5 text-11.5 text-slate-500 dark:text-slate-400 min-w-0">
            <span className="inline-flex items-center gap-1 min-w-0 shrink">
              <WhoAvatar src={item.whoAvatar} name={item.who} size={16} />
              <span className="truncate">{item.who || '—'}</span>
            </span>
            {item.location && (
              <>
                <span className="shrink-0 text-slate-300 dark:text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 min-w-0 shrink-[2]">
                  <MapPin size={11} className="shrink-0 text-slate-400" />
                  <span className="truncate">{item.location}</span>
                </span>
              </>
            )}
          </span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={isBusy}
            onClick={(e) => {
              e.stopPropagation();
              onPrimary(item);
            }}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full text-12.5 font-semibold text-white cursor-pointer transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-wait',
              meta.primary
            )}
          >
            {isBusy ? <Loader2 size={13} className="animate-spin" /> : <PrimaryIcon size={13} strokeWidth={2.5} />}
            {t(meta.primaryKey)}
          </button>
          <Tooltip title={t('dashboard_home.inbox_reject')} placement="top">
            {/* span wrapper: MUI tooltips need a non-disabled child to receive hover events. */}
            <span className="inline-flex">
              <button
                type="button"
                disabled={isBusy}
                onClick={(e) => {
                e.stopPropagation();
                onReject(item);
              }}
                aria-label={t('dashboard_home.inbox_reject')}
                className={cn(
                  'inline-flex items-center justify-center w-8 h-8 rounded-full transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-90 cursor-pointer disabled:opacity-50 disabled:hover:translate-y-0',
                  DECLINE_BTN
                )}
              >
                <CalendarX2 size={14} strokeWidth={2.25} />
              </button>
            </span>
          </Tooltip>
        </div>
      </motion.li>
    );
  }

  return (
    <motion.li
      onClick={() => onOpen(item)}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { ...SPRING, delay: 0.3 + index * 0.05 } }}
      exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.22 } }}
      className={cn(
        // The single dashboard card wears its kind's warm wash at rest (the long modal list only shows it on hover).
        'group relative isolate rounded-xl border bg-white dark:bg-slate-900 p-3 overflow-hidden cursor-pointer transition-[background-color,border-color,box-shadow] duration-200',
        meta.restBorder,
        meta.hover
      )}
    >
      <span
        aria-hidden
        className={cn('pointer-events-none absolute inset-0 -z-10 rounded-[inherit]', meta.glow)}
      />
      <div className="flex items-center justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[12px] font-normal', meta.chip)}>
          <KindIcon size={11} strokeWidth={2.2} />
          {t(meta.labelKey)}
        </span>
        <span className={cn('inline-flex items-center gap-1 text-10.5 font-semibold', badge.className)}>
          {BadgeIcon && <BadgeIcon size={11} />}
          {badge.text}
        </span>
      </div>

      <button type="button" onClick={(e) => {
          e.stopPropagation();
          onOpen(item);
        }} className="mt-1.5 block w-full text-left cursor-pointer">
        <span className="text-13 font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-[#00529C] dark:group-hover:text-blue-400 transition-colors">
          {item.urgent && (
            <AlertCircle size={12} className="inline -mt-0.5 mr-1 text-rose-500" aria-label={t('dashboard_home.urgent')} />
          )}
          {item.title || t('dashboard_home.untitled')}
        </span>
        <span className="mt-1 flex items-center gap-1 text-11 text-slate-500 dark:text-slate-400 min-w-0">
          <WhoAvatar src={item.whoAvatar} name={item.who} size={16} />
          <span className="truncate">{item.who || '—'}</span>
          <span className="shrink-0 text-slate-300 dark:text-slate-600">•</span>
          <span className="shrink-0 tabular-nums capitalize">{item.start.format('dd DD/MM · HH:mm')}</span>
        </span>
      </button>

      <div className="mt-2.5 flex items-center gap-2">
        <motion.button
          type="button"
          whileHover={isBusy ? undefined : { y: -2, transition: { duration: 0.15, ease: 'easeOut' } }}
          whileTap={{ scale: 0.96, y: 0 }}
          disabled={isBusy}
          onClick={(e) => {
              e.stopPropagation();
              onPrimary(item);
            }}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-full text-12 font-semibold text-white cursor-pointer transition-colors disabled:opacity-70 disabled:cursor-wait',
            meta.primary
          )}
        >
          {isBusy ? <Loader2 size={14} className="animate-spin" /> : <PrimaryIcon size={14} strokeWidth={2.5} />}
          {t(meta.primaryKey)}
        </motion.button>
        <motion.button
          type="button"
          whileHover={isBusy ? undefined : { y: -2, transition: { duration: 0.15, ease: 'easeOut' } }}
          whileTap={{ scale: 0.96, y: 0 }}
          disabled={isBusy}
          onClick={(e) => {
                e.stopPropagation();
                onReject(item);
              }}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full text-12 font-semibold transition-colors cursor-pointer disabled:opacity-50',
            DECLINE_BTN
          )}
        >
          <CalendarX2 size={13} strokeWidth={2.25} />
          {t('dashboard_home.inbox_reject')}
        </motion.button>
      </div>
    </motion.li>
  );
};

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import { AnimatePresence, motion, useMotionValue } from 'motion/react';
import { AlertCircle, BellRing, Loader2, Maximize2, PartyPopper, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useInfinitePendingActionsQuery } from '../hooks/useDashboardQueries';
import { Tooltip } from '../../../components/ui';
import { cn } from '../../../utils/helpers';
import { InboxCard, byUrgencyThenStart, toInboxItems, type InboxCardHandlers, type InboxItem, type InboxKind } from './InboxCard';

export type PendingFilter = 'all' | InboxKind;

const PANEL_Z = 999;
const PILL_Z = 1400;
const SHELL_EASE = [0.32, 0.72, 0, 1] as const;
const PILL_INSET = 24;
const DEFAULT_PILL_SIZE = { width: 300, height: 48 };

type ShellMode = 'minimize' | 'close';

interface PendingActionsModalProps extends InboxCardHandlers {
  open: boolean;
  initialFilter: PendingFilter;
  canApprove: boolean;
  minimized: boolean;
  onRestore: () => void;
  onClose: () => void;
}

export const PendingActionsModal: React.FC<PendingActionsModalProps> = ({
  open,
  initialFilter,
  canApprove,
  minimized,
  onRestore,
  onClose,
  ...handlers
}) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<PendingFilter>(initialFilter);

  useEffect(() => {
    if (open) setFilter(initialFilter);
  }, [open, initialFilter]);

  const { approvals, invitations, status, refetch } = useInfinitePendingActionsQuery(canApprove, open);
  const approvalTotal = approvals.total;
  const invitationTotal = invitations.total;

  const sources = [
    ...(filter !== 'approval' ? [invitations] : []),
    ...(filter !== 'invitation' ? [approvals] : []),
  ];
  const hasMore = sources.some((src) => src.hasNextPage);
  const isFetchingMore = sources.some((src) => src.isFetchingNextPage);

  const allItems = useMemo(
    () => toInboxItems({ items: approvals.items }, { items: invitations.items }, canApprove),
    [approvals.items, invitations.items, canApprove]
  );

  const groups = useMemo(() => {
    const today = dayjs();
    const kindsWithMore = new Set(
      [filter !== 'approval' && invitations.hasNextPage && 'invitation', filter !== 'invitation' && approvals.hasNextPage && 'approval'].filter(Boolean)
    );
    const cutoff = Math.min(
      ...allItems
        .filter((item) => kindsWithMore.has(item.kind))
        .reduce<Map<string, number>>((acc, item) => acc.set(item.kind, Math.max(acc.get(item.kind) ?? 0, item.start.valueOf())), new Map())
        .values(),
      Infinity
    );
    const visible = allItems.filter(
      (item) => (filter === 'all' || item.kind === filter) && (kindsWithMore.size < 2 || item.start.valueOf() <= cutoff)
    );
    const byDay = new Map<string, InboxItem[]>();
    [...visible]
      .sort((a, b) => a.start.valueOf() - b.start.valueOf())
      .forEach((item) => {
        const key = item.start.format('YYYY-MM-DD');
        byDay.set(key, [...(byDay.get(key) ?? []), item]);
      });
    return [...byDay.entries()].map(([key, items]) => {
      const day = dayjs(key);
      const label = day.isSame(today, 'day')
        ? t('dashboard_home.today')
        : day.isSame(today.add(1, 'day'), 'day')
        ? t('dashboard_home.tomorrow')
        : day.format('dddd, DD/MM/YYYY');
      return { key, label, isToday: day.isSame(today, 'day'), items: items.sort(byUrgencyThenStart) };
    });
  }, [allItems, filter, invitations.hasNextPage, approvals.hasNextPage, t]);

  const filters: { key: PendingFilter; label: string; count: number }[] = [
    { key: 'all', label: t('dashboard_home.filter_all'), count: approvalTotal + invitationTotal },
    { key: 'invitation', label: t('dashboard_home.inbox_tag_invitation'), count: invitationTotal },
    ...(canApprove ? [{ key: 'approval' as const, label: t('dashboard_home.inbox_tag_approval'), count: approvalTotal }] : []),
  ];

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const savedScrollTop = useRef(0);
  const pillX = useMotionValue(0);
  const pillY = useMotionValue(0);
  const pillBoundsRef = useRef<HTMLDivElement>(null);
  const pillDraggedRef = useRef(false);
  const pillSizeRef = useRef(DEFAULT_PILL_SIZE);
  const expanded = open && !minimized;
  const restoringRef = useRef(false);

  const toPill = () => {
    const { width, height } = pillSizeRef.current;
    return {
      x: PILL_INSET + width / 2 + pillX.get() - window.innerWidth / 2,
      y: window.innerHeight - PILL_INSET - height / 2 + pillY.get() - window.innerHeight / 2,
      scale: 0.12,
      opacity: 0,
    };
  };
  const shellVariants = {
    enter: () => (restoringRef.current ? toPill() : { x: 0, y: 8, scale: 0.96, opacity: 0 }),
    shown: { x: 0, y: 0, scale: 1, opacity: 1 },
    exit: (mode: ShellMode) => (mode === 'minimize' ? toPill() : { x: 0, y: 8, scale: 0.96, opacity: 0 }),
  };
  const exitMode: ShellMode = open && minimized ? 'minimize' : 'close';

  useEffect(() => {
    if (!open) {
      savedScrollTop.current = 0;
      pillX.set(0);
      pillY.set(0);
      restoringRef.current = false;
    } else if (minimized) {
      restoringRef.current = true;
    }
  }, [open, minimized]);

  useLayoutEffect(() => {
    if (!expanded) return;
    if (scrollRef.current) scrollRef.current.scrollTop = savedScrollTop.current;
    panelRef.current?.focus({ preventScroll: true });
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelRef.current?.contains(document.activeElement)) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded, onClose]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<() => void>(() => {});
  loadMoreRef.current = () => {
    sources.forEach((src) => {
      if (src.hasNextPage && !src.isFetchingNextPage) src.fetchNextPage();
    });
  };

  useEffect(() => {
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!expanded || !root || !target || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current();
      },
      { root, rootMargin: '0px 0px 240px 0px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [expanded, hasMore, status, filter, groups.length]);

  let cardIndex = 0;

  return createPortal(
    <AnimatePresence custom={exitMode}>
      {expanded && (
        <motion.div
          key="mask"
          className="fixed inset-0 bg-slate-950/45"
          style={{ zIndex: PANEL_Z }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
      )}
      {expanded && (
        <div key="panel" className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none" style={{ zIndex: PANEL_Z }}>
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('dashboard_home.inbox_modal_title')}
            tabIndex={-1}
            variants={shellVariants}
            initial="enter"
            animate="shown"
            exit="exit"
            transition={{ duration: 0.34, ease: SHELL_EASE }}
            onAnimationComplete={() => {
              restoringRef.current = false;
            }}
            style={{ borderRadius: 16 }}
            className="pointer-events-auto relative will-change-transform w-[600px] max-w-full overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl outline-none"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={t('dashboard_home.inbox_close')}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
      <div className="flex flex-col h-[min(640px,calc(100vh-96px))]">
        <div className="flex flex-col gap-3 px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white bg-gradient-to-br from-orange-400 to-rose-500 shadow-[0_4px_10px_-2px_rgba(244,63,94,0.45)]">
              <BellRing size={19} />
            </div>
            <div className="min-w-0">
              <h3 className="text-15 font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {t('dashboard_home.inbox_modal_title')}
              </h3>
              <p className="text-12 text-slate-500 dark:text-slate-400 mt-0.5">
                {t('dashboard_home.inbox_modal_subtitle', { count: approvalTotal + invitationTotal })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 p-0.5 self-start rounded-full bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map((f) => {
              const isActive = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    'relative h-8 px-3 rounded-full text-12 font-medium whitespace-nowrap transition-colors cursor-pointer',
                    isActive ? 'text-[#00529C] dark:text-blue-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="pending-modal-filter-pill"
                      className="absolute inset-0 rounded-full bg-white dark:bg-slate-900 shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    {f.label}
                    <span className="text-11 tabular-nums text-slate-400 dark:text-slate-500">{f.count}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={(e) => {
            savedScrollTop.current = e.currentTarget.scrollTop;
          }}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 bg-slate-50 dark:bg-slate-950 [scrollbar-width:thin]">
          {status === 'loading' ? (
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[78px] rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center text-center py-10 gap-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
                <AlertCircle size={22} />
              </div>
              <p className="text-13 font-semibold text-slate-700 dark:text-slate-200">{t('dashboard_home.inbox_error_title')}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="h-8 px-3 rounded-full text-12 font-medium text-[#00529C] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              >
                {t('dashboard_home.inbox_error_retry')}
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-[0_6px_16px_-6px_rgba(16,185,129,0.7)] mb-3">
                <PartyPopper size={22} />
              </div>
              <p className="text-13 font-semibold text-slate-700 dark:text-slate-200">{t('dashboard_home.inbox_empty_title')}</p>
              <p className="text-11.5 text-slate-500 dark:text-slate-400 mt-0.5">{t('dashboard_home.inbox_empty_desc')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <section key={group.key} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-0.5">
                    <span
                      className={cn(
                        'inline-block text-12 font-semibold first-letter:uppercase',
                        group.isToday ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'
                      )}
                    >
                      {group.label}
                    </span>
                    <span className="text-11 tabular-nums text-slate-400 dark:text-slate-500">{group.items.length}</span>
                    <span className="flex-1 h-px bg-slate-200/80 dark:bg-slate-800" />
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    <AnimatePresence initial={false}>
                      {group.items.map((item) => (
                        <InboxCard key={`${item.kind}-${item.id}`} item={item} index={Math.min(cardIndex++, 10)} compact {...handlers} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              ))}
              {hasMore && (
                <div ref={sentinelRef} className="flex items-center justify-center gap-2 py-2 text-12 text-slate-400 dark:text-slate-500">
                  {isFetchingMore && <Loader2 size={14} className="animate-spin" />}
                  {t('dashboard_home.inbox_loading_more')}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
          </motion.div>
        </div>
      )}
      {open && minimized && <div key="pill-bounds" ref={pillBoundsRef} className="fixed inset-3 pointer-events-none" />}
      {open && minimized && (
        <motion.div
          key="pill"
          drag
          dragMomentum={false}
          dragElastic={0.08}
          dragConstraints={pillBoundsRef}
          onDragStart={() => {
            pillDraggedRef.current = true;
          }}
          onDragEnd={() => {
            setTimeout(() => {
              pillDraggedRef.current = false;
            }, 0);
          }}
          style={{ x: pillX, y: pillY, zIndex: PILL_Z }}
          className="fixed bottom-6 left-6 touch-none cursor-grab active:cursor-grabbing"
        >
        <motion.div
          ref={(el) => {
            if (el) pillSizeRef.current = { width: el.offsetWidth, height: el.offsetHeight };
          }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.22, delay: 0.16, ease: SHELL_EASE } }}
          exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.12 } }}
          style={{ borderRadius: 999 }}
          className="flex items-center gap-1 p-1.5 pr-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-[0_12px_32px_-10px_rgba(15,23,42,0.35)]"
        >
          <Tooltip title={t('dashboard_home.inbox_restore')} placement="top">
            <motion.button
              type="button"
              onClick={() => {
                if (!pillDraggedRef.current) onRestore();
              }}
              className="group flex items-center gap-2.5 pl-1 pr-2 py-0.5 rounded-full cursor-[inherit]"
            >
              <span className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white bg-gradient-to-br from-orange-400 to-rose-500">
                <BellRing size={17} />
                {approvalTotal + invitationTotal > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 text-10 font-semibold leading-[18px] text-center tabular-nums">
                    {approvalTotal + invitationTotal}
                  </span>
                )}
              </span>
              <span className="text-13 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap group-hover:text-[#00529C] dark:group-hover:text-blue-400 transition-colors">
                {t('dashboard_home.inbox_modal_title')}
              </span>
              <Maximize2 size={14} className="text-slate-400 group-hover:text-[#00529C] dark:group-hover:text-blue-400 transition-colors" />
            </motion.button>
          </Tooltip>
          <motion.button
            type="button"
            onClick={() => {
              if (!pillDraggedRef.current) onClose();
            }}
            aria-label={t('dashboard_home.inbox_close')}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={14} />
          </motion.button>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default PendingActionsModal;

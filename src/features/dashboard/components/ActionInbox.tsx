import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import { BellRing, AlertCircle, ArrowRight, PartyPopper } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '../../../store/toastStore';
import { useOverviewLeaderId } from '../../work-schedule/TongHop/hooks/useCalendarOverviewQuery';
import { useApproveRequestMutation, useRejectRequestMutation } from '../../work-schedule/PheDuyetLich/hooks/useScheduleApprovalQueries';
import { useConfirmInvitationMutation, useDeclineInvitationMutation } from '../../work-schedule/LichMoiThamDu/hooks/useInvitationQueries';
import { usePendingActionsQuery } from '../hooks/useDashboardQueries';
import type { ApprovalRequest } from '../../work-schedule/PheDuyetLich/types';
import type { MeetingInvitation } from '../../work-schedule/LichMoiThamDu/types';
import { cn, getApiErrorMessage } from '../../../utils/helpers';
import { ScheduleCalendarType } from '../../../constants/scheduleCalendarType';
import type { ScheduleDetailTarget } from './ScheduleDetailModal';
import { LazyDeclineAttendanceDialog, LazyRejectDialog, LazyScheduleDetailModal, useMountedOnce } from './lazyDialogs';
import { SectionIcon } from './HomeBits';
import { CALENDAR_OVERVIEW_QUERY_KEY, EASE_OUT_EXPO, SECTION_ICON_BG, SURFACE } from '../homeTheme';
import { InboxCard, byUrgencyThenStart, toInboxItems, type InboxItem } from './InboxCard';
import { PendingActionsModal, type PendingFilter } from './PendingActionsModal';

const PREVIEW_LIMIT = 5;

/** "Needs action now": pending approvals + unanswered invitations, actionable inline. */
export const ActionInbox: React.FC<{ canApprove: boolean }> = ({ canApprove }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const leaderId = useOverviewLeaderId();
  const {
    approvalsPage,
    invitationsPage,
    approvalTotal,
    invitationTotal,
    status: pendingStatus,
    refetch: refetchPending,
  } = usePendingActionsQuery(canApprove);

  const approveMutation = useApproveRequestMutation();
  const rejectMutation = useRejectRequestMutation();
  const confirmMutation = useConfirmInvitationMutation();
  const declineMutation = useDeclineInvitationMutation();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<ScheduleDetailTarget | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ApprovalRequest | null>(null);
  const [declineTarget, setDeclineTarget] = useState<MeetingInvitation | null>(null);
  const [modalFilter, setModalFilter] = useState<PendingFilter | null>(null);
  const [modalMinimized, setModalMinimized] = useState(false);
  const closeModal = useCallback(() => {
    setModalFilter(null);
    setModalMinimized(false);
  }, []);

  // Stable arrays: the dialogs reset their reason field whenever this prop changes identity.
  const rejectRequests = useMemo(() => (rejectTarget ? [rejectTarget] : []), [rejectTarget]);
  const declineInvitations = useMemo(() => (declineTarget ? [declineTarget] : []), [declineTarget]);
  const detailMounted = useMountedOnce(!!detailTarget);
  const rejectMounted = useMountedOnce(!!rejectTarget);
  const declineMounted = useMountedOnce(!!declineTarget);

  const total = approvalTotal + invitationTotal;
  const isLoading = pendingStatus === 'loading';

  const items = useMemo<InboxItem[]>(() => {
    const all = toInboxItems(approvalsPage, invitationsPage, canApprove);
    if (all.length === 0) return [];

    const now = dayjs();
    const today = now.startOf('day');
    const tomorrow = today.add(1, 'day');

    const todayItems = all.filter((item) => item.start.isSame(today, 'day'));
    if (todayItems.length > 0) {
      return todayItems.sort(byUrgencyThenStart).slice(0, PREVIEW_LIMIT);
    }

    const tomorrowItems = all.filter((item) => item.start.isSame(tomorrow, 'day'));
    if (tomorrowItems.length > 0) {
      return tomorrowItems.sort(byUrgencyThenStart).slice(0, PREVIEW_LIMIT);
    }

    const sortedByDate = [...all].sort((a, b) => a.start.valueOf() - b.start.valueOf());
    const nextEarliest = sortedByDate[0];
    const targetDay = nextEarliest.start.startOf('day');
    const dayItems = all.filter((item) => item.start.isSame(targetDay, 'day'));
    return dayItems.sort(byUrgencyThenStart).slice(0, PREVIEW_LIMIT);
  }, [approvalsPage, invitationsPage, canApprove]);

  const refreshDashboard = () => queryClient.invalidateQueries({ queryKey: CALENDAR_OVERVIEW_QUERY_KEY });
  const onError = (error: unknown) => toast.error(getApiErrorMessage(error) || t('dashboard_home.inbox_action_error'));

  const handlePrimary = (item: InboxItem) => {
    setBusyId(item.id);
    if (item.kind === 'approval') {
      approveMutation.mutate([item.id], {
        onSuccess: () => {
          toast.success(t('schedule_approval.toast_approve_success'));
          refreshDashboard();
        },
        onError,
        onSettled: () => setBusyId(null),
      });
    } else if (leaderId) {
      confirmMutation.mutate(
        { ids: [item.id], participantId: leaderId },
        {
          onSuccess: () => toast.success(t('meeting_invitations.toast_confirm_success')),
          onError,
          onSettled: () => setBusyId(null),
        }
      );
    }
  };

  const handleRejectConfirm = (reason: string) => {
    if (!rejectTarget) return;
    rejectMutation.mutate(
      { ids: [rejectTarget.id], reason },
      {
        onSuccess: () => {
          toast.success(t('schedule_approval.toast_reject_success'));
          setRejectTarget(null);
          refreshDashboard();
        },
        onError,
      }
    );
  };

  const handleDeclineConfirm = (reason?: string) => {
    if (!declineTarget || !leaderId) return;
    declineMutation.mutate(
      { ids: [declineTarget.id], participantId: leaderId, reason },
      {
        onSuccess: () => {
          toast.success(t('meeting_invitations.toast_decline_success'));
          setDeclineTarget(null);
        },
        onError,
      }
    );
  };

  const cardHandlers = {
    busyId,
    onPrimary: handlePrimary,
    onReject: (item: InboxItem) => (item.kind === 'approval' ? setRejectTarget(item.raw) : setDeclineTarget(item.raw)),
    onOpen: (item: InboxItem) =>
      setDetailTarget({
        id: item.id,
        calendarType: item.kind === 'approval' ? ScheduleCalendarType.LeaderApproval : ScheduleCalendarType.Invitation,
      }),
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.24, ease: EASE_OUT_EXPO }}
      className={cn(SURFACE, 'p-5 flex flex-col gap-3')}
    >
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <SectionIcon icon={BellRing} className={SECTION_ICON_BG.inbox}>
            {/* Live dot in the corner, only while something is waiting */}
            {total > 0 && (
              <span className="absolute -top-1 -right-1 flex w-3 h-3">
                <span className="absolute inset-0 rounded-full bg-rose-500 opacity-60 animate-ping" />
                <span className="relative w-3 h-3 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              </span>
            )}
          </SectionIcon>
          <h3 className="text-14.5 font-semibold text-slate-800 dark:text-slate-100">{t('dashboard_home.inbox_title')}</h3>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[112px] rounded-xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      ) : pendingStatus === 'error' ? (
        <div className="flex flex-col items-center text-center py-8 px-4 gap-2">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <AlertCircle size={22} />
          </div>
          <p className="text-13 font-semibold text-slate-700 dark:text-slate-200">{t('dashboard_home.inbox_error_title')}</p>
          <button
            type="button"
            onClick={() => refetchPending()}
            className="h-8 px-3 rounded-full text-12 font-medium text-[#00529C] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
          >
            {t('dashboard_home.inbox_error_retry')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center py-8 px-4"
        >
          <motion.div
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-[0_6px_16px_-6px_rgba(16,185,129,0.7)] mb-3"
          >
            <PartyPopper size={22} />
          </motion.div>
          <p className="text-13 font-semibold text-slate-700 dark:text-slate-200">{t('dashboard_home.inbox_empty_title')}</p>
          <p className="text-11.5 text-slate-500 dark:text-slate-400 mt-0.5 max-w-[300px] text-balance">{t('dashboard_home.inbox_empty_desc')}</p>
        </motion.div>
      ) : (
        <motion.ul layout className="flex flex-col gap-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((item, i) => (
              <InboxCard key={`${item.kind}-${item.id}`} item={item} index={i} {...cardHandlers} />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      {!isLoading && total > items.length && (
        <div className="flex flex-col gap-1 pt-1">
          {approvalTotal > 0 && (
            <button
              type="button"
              onClick={() => setModalFilter('approval')}
              className="group flex items-center justify-between px-2 py-1.5 rounded-lg text-12 font-medium text-[#00529C] dark:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
            >
              {t('dashboard_home.inbox_view_all_approvals', { count: approvalTotal })}
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
          {invitationTotal > 0 && (
            <button
              type="button"
              onClick={() => setModalFilter('invitation')}
              className="group flex items-center justify-between px-2 py-1.5 rounded-lg text-12 font-medium text-[#00529C] dark:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
            >
              {t('dashboard_home.inbox_view_all_invitations', { count: invitationTotal })}
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      )}

      <PendingActionsModal
        open={modalFilter !== null}
        initialFilter={modalFilter ?? 'all'}
        canApprove={canApprove}
        minimized={modalMinimized}
        onRestore={() => {
          setDetailTarget(null);
          setModalMinimized(false);
        }}
        onClose={closeModal}
        {...cardHandlers}
        // Opening a row's detail tucks the list into a corner pill instead of stacking under the detail modal.
        onOpen={(item) => {
          setModalMinimized(true);
          cardHandlers.onOpen(item);
        }}
      />
      <Suspense fallback={null}>
        {detailMounted && (
          <LazyScheduleDetailModal target={detailTarget} leaderId={leaderId} onClose={() => setDetailTarget(null)} />
        )}
        {rejectMounted && (
          <LazyRejectDialog
            requests={rejectRequests}
            onCancel={() => setRejectTarget(null)}
            onConfirm={handleRejectConfirm}
            loading={rejectMutation.isPending}
          />
        )}
        {declineMounted && (
          <LazyDeclineAttendanceDialog
            invitations={declineInvitations}
            onCancel={() => setDeclineTarget(null)}
            onConfirm={handleDeclineConfirm}
            loading={declineMutation.isPending}
          />
        )}
      </Suspense>
    </motion.section>
  );
};

export default ActionInbox;

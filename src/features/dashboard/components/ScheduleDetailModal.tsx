import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '../../../store/toastStore';
import { ScheduleCalendarType } from '../../../constants/scheduleCalendarType';
import { scheduleOccurrenceAPI } from '../../../services/api/scheduleOccurrenceAPI';
import { getApiErrorMessage } from '../../../utils/helpers';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { CancelScheduleModal } from '../../../components/shared/CancelScheduleModal';
import { DeclineAttendanceDialog, InvitationDetailModal } from '../../work-schedule/LichMoiThamDu/MeetingInvitations';
import { mapOccurrenceToInvitation } from '../../work-schedule/LichMoiThamDu/utils/occurrenceAdapter';
import {
  useConfirmInvitationMutation,
  useDeclineInvitationMutation,
} from '../../work-schedule/LichMoiThamDu/hooks/useInvitationQueries';
import { PersonalScheduleDetailModal } from '../../work-schedule/LichCaNhan/components/PersonalScheduleDetailModal';
import { mapOccurrenceToEvent as mapOccurrenceToPersonalEvent } from '../../work-schedule/LichCaNhan/utils/occurrenceAdapter';
import {
  useApprovePersonalScheduleMutation,
  useRejectPersonalScheduleMutation,
} from '../../work-schedule/LichCaNhan/hooks/usePersonalCalendarQueries';
import { LeadershipScheduleDetailModal } from '../../work-schedule/DangKyLichLanhDao/components/LeadershipScheduleDetailModal';
import { mapOccurrenceToRequest } from '../../work-schedule/DangKyLichLanhDao/utils/occurrenceAdapter';
import { useCancelLeadershipRequestMutation } from '../../work-schedule/DangKyLichLanhDao/hooks/useLeadershipScheduleQueries';
import { RejectDialog } from '../../work-schedule/PheDuyetLich/ScheduleApproval';
import { mapOccurrenceToApprovalRequest } from '../../work-schedule/PheDuyetLich/utils/occurrenceAdapter';
import {
  useApproveRequestMutation,
  useRejectRequestMutation,
} from '../../work-schedule/PheDuyetLich/hooks/useScheduleApprovalQueries';
import { CALENDAR_OVERVIEW_QUERY_KEY } from '../homeTheme';

export interface ScheduleDetailTarget {
  id: string;
  calendarType: ScheduleCalendarType;
}

interface ScheduleDetailModalProps {
  target: ScheduleDetailTarget | null;
  leaderId?: string;
  onClose: () => void;
}

const EMPTY_EXECUTIVES = new Map();
const DETAIL_QUERY_KEY = 'overview-occurrence-detail';

type PendingAction = 'approve' | 'reject' | 'cancel' | 'decline' | null;

/**
 * Detail view for any dashboard schedule, with the same actions the source pages offer
 * (accept/decline invitation, approve/reject, cancel own registration). Each wrapped modal
 * decides by itself when a button applies (status, viewer role), we only supply the handlers.
 */
export const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({ target, leaderId, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingAction>(null);

  const { data: occurrence, isLoading } = useQuery({
    queryKey: [DETAIL_QUERY_KEY, target?.id],
    queryFn: () => scheduleOccurrenceAPI.getScheduleOccurrenceById(target!.id),
    enabled: !!target,
  });

  const confirmInvitation = useConfirmInvitationMutation();
  const declineInvitation = useDeclineInvitationMutation();
  const approvePersonal = useApprovePersonalScheduleMutation();
  const rejectPersonal = useRejectPersonalScheduleMutation();
  const approveRequest = useApproveRequestMutation();
  const rejectRequest = useRejectRequestMutation();
  const cancelRegistration = useCancelLeadershipRequestMutation();

  const type = target?.calendarType;
  const isPersonal = type === ScheduleCalendarType.Personal;
  const isApproval = type === ScheduleCalendarType.LeaderApproval;
  const isRegistration = type === ScheduleCalendarType.LeaderRegistration;

  const personalEvent = useMemo(
    () => (occurrence && isPersonal ? mapOccurrenceToPersonalEvent(occurrence) : null),
    [occurrence, isPersonal]
  );
  const leadershipRequest = useMemo(
    () => (occurrence && (isApproval || isRegistration) ? mapOccurrenceToRequest(occurrence) : null),
    [occurrence, isApproval, isRegistration]
  );
  const invitation = useMemo(
    () => (occurrence && type === ScheduleCalendarType.Invitation ? mapOccurrenceToInvitation(occurrence, leaderId) : null),
    [occurrence, type, leaderId]
  );
  const rejectTargets = useMemo(
    () => (pending === 'reject' && occurrence ? [mapOccurrenceToApprovalRequest(occurrence)] : []),
    [pending, occurrence]
  );
  const declineTargets = useMemo(() => (pending === 'decline' && invitation ? [invitation] : []), [pending, invitation]);

  const title = occurrence?.title?.trim() || '';

  const onError = (error: unknown) => toast.error(getApiErrorMessage(error) || t('dashboard_home.inbox_action_error'));

  const finish = (message: string) => {
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: CALENDAR_OVERVIEW_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: [DETAIL_QUERY_KEY] });
    setPending(null);
    onClose();
  };

  const handleConfirmInvitation = () => {
    if (!target || !leaderId) return;
    confirmInvitation.mutate(
      { ids: [target.id], participantId: leaderId },
      { onSuccess: () => finish(t('meeting_invitations.toast_confirm_success')), onError }
    );
  };

  const handleDecline = (reason?: string) => {
    if (!target || !leaderId) return;
    declineInvitation.mutate(
      { ids: [target.id], participantId: leaderId, reason },
      { onSuccess: () => finish(t('meeting_invitations.toast_decline_success')), onError }
    );
  };

  const handleApprove = () => {
    if (!target) return;
    const opts = { onSuccess: () => finish(t('schedule_approval.toast_approve_success')), onError };
    if (isPersonal) approvePersonal.mutate(target.id, opts);
    else approveRequest.mutate([target.id], opts);
  };

  const handleReject = (reason: string) => {
    if (!target) return;
    const opts = { onSuccess: () => finish(t('schedule_approval.toast_reject_success')), onError };
    if (isPersonal) rejectPersonal.mutate({ id: target.id, reason }, opts);
    else rejectRequest.mutate({ ids: [target.id], reason }, opts);
  };

  const handleCancel = (reason: string) => {
    if (!target) return;
    cancelRegistration.mutate(
      { id: target.id, reason },
      { onSuccess: () => finish(t('leadership_schedule.toast_cancel_success')), onError }
    );
  };

  if (!target) return null;

  const openApprove = () => setPending('approve');
  const openReject = () => setPending('reject');

  let detail: React.ReactNode;
  if (isPersonal) {
    detail = (
      <PersonalScheduleDetailModal
        open
        event={isLoading ? null : personalEvent}
        onClose={onClose}
        onApprove={openApprove}
        onReject={openReject}
      />
    );
  } else if (isApproval || isRegistration) {
    detail = (
      <LeadershipScheduleDetailModal
        open
        request={isLoading ? null : leadershipRequest}
        executiveById={EMPTY_EXECUTIVES}
        onClose={onClose}
        onApprove={isApproval ? openApprove : undefined}
        onReject={isApproval ? openReject : undefined}
        onCancel={isRegistration ? () => setPending('cancel') : undefined}
      />
    );
  } else {
    detail = (
      <InvitationDetailModal
        invitation={isLoading ? null : invitation}
        onClose={onClose}
        onConfirm={handleConfirmInvitation}
        onDecline={() => setPending('decline')}
      />
    );
  }

  return (
    <>
      {detail}

      <ConfirmModal
        open={pending === 'approve'}
        onCancel={() => setPending(null)}
        onConfirm={handleApprove}
        loading={approvePersonal.isPending || approveRequest.isPending}
        variant="success"
        uppercaseTitle={false}
        title={t('schedule_approval.approve_confirm_title')}
        description={
          <>
            {t('schedule_approval.approve_confirm_desc')}{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">&ldquo;{title}&rdquo;</span>
          </>
        }
        confirmText={t('schedule_approval.approve_confirm_ok')}
        cancelText={t('schedule_approval.approve_confirm_cancel')}
      />

      <RejectDialog
        requests={rejectTargets}
        onCancel={() => setPending(null)}
        onConfirm={handleReject}
        loading={rejectPersonal.isPending || rejectRequest.isPending}
      />

      <CancelScheduleModal
        open={pending === 'cancel'}
        onCancel={() => setPending(null)}
        onConfirm={handleCancel}
        loading={cancelRegistration.isPending}
        scheduleTitle={title}
        title={t('leadership_schedule.cancel_confirm_title')}
      />

      <DeclineAttendanceDialog
        invitations={declineTargets}
        onCancel={() => setPending(null)}
        onConfirm={handleDecline}
        loading={declineInvitation.isPending}
      />
    </>
  );
};

export default ScheduleDetailModal;

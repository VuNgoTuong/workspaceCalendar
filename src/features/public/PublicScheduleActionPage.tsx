import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Modal, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, CalendarX } from 'lucide-react';
import { Button } from '../../components/ui';
import { useThemeStore } from '../../store/themeStore';
import { scheduleOccurrenceAPI } from '../../services/api/scheduleOccurrenceAPI';
import { scheduleParticipantAPI } from '../../services/api/scheduleParticipantAPI';

type ActionKind = 'leader' | 'invitation';
type PageStatus = 'loading' | 'reject_reason' | 'success' | 'error';

interface PublicScheduleActionPageProps {
  kind: ActionKind;
}

const ENTITY_LABEL_KEY: Record<ActionKind, string> = {
  leader: 'public_action.entity_leader',
  invitation: 'public_action.entity_invitation',
};

const REJECT_TITLE_KEY: Record<ActionKind, string> = {
  leader: 'public_action.reject_title_leader',
  invitation: 'public_action.reject_title_invitation',
};

export const PublicScheduleActionPage: React.FC<PublicScheduleActionPageProps> = ({ kind }) => {
  useThemeStore();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const status = searchParams.get('status'); // 'approved' | 'rejected'

  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [isSuccessAction, setIsSuccessAction] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const entityLabel = t(ENTITY_LABEL_KEY[kind]);

  const showError = (msg: string) => {
    setIsSuccessAction(false);
    setIsExpired(false);
    setTitle(t('public_action.error_title'));
    setMessage(msg);
    setPageStatus('error');
  };

  const showExpired = (msg: string) => {
    setIsSuccessAction(false);
    setIsExpired(true);
    setTitle(t('public_action.expired_title'));
    setMessage(msg);
    setPageStatus('error');
  };

  const showSuccess = (msg: string, successTitle: string) => {
    setIsSuccessAction(true);
    setTitle(successTitle);
    setMessage(msg);
    setPageStatus('success');
  };

  const callApprove = async () => {
    if (!token) return;
    setPageStatus('loading');
    try {
      const res =
        kind === 'leader'
          ? await scheduleOccurrenceAPI.approveScheduleByToken(token)
          : await scheduleParticipantAPI.approveInvitationByToken(token);
      if (res.isSuccess) {
        showSuccess(res.message || t('public_action.approve_success_message', { entity: entityLabel }), t('public_action.approve_success_title'));
      } else {
        showError(res.message || t('public_action.approve_failed'));
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message;
      showError(errMsg || t('public_action.approve_failed'));
    }
  };

  const callReject = async (rejectReason: string) => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      const res =
        kind === 'leader'
          ? await scheduleOccurrenceAPI.rejectScheduleByToken(token, rejectReason)
          : await scheduleParticipantAPI.rejectInvitationByToken(token, rejectReason);
      if (res.isSuccess) {
        showSuccess(res.message || t('public_action.reject_success_message', { entity: entityLabel }), t('public_action.reject_success_title'));
      } else {
        showError(res.message || t('public_action.reject_failed'));
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message;
      showError(errMsg || t('public_action.reject_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!token) {
      showExpired(t('public_action.missing_token'));
      return;
    }

    if (status === 'approved') {
      callApprove();
    } else if (status === 'rejected') {
      setPageStatus('reject_reason');
    } else {
      showExpired(t('public_action.missing_status'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status]);

  const shouldRedirect = pageStatus === 'success' || pageStatus === 'error';

  useEffect(() => {
    if (!shouldRedirect) return;
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [pageStatus, shouldRedirect]);

  useEffect(() => {
    if (shouldRedirect && countdown <= 0) {
      navigate('/');
    }
  }, [countdown, shouldRedirect, navigate]);

  const handleCancelReject = () => {
    showError(t('public_action.reject_cancelled'));
  };

  const handleConfirmReject = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonTouched(true);
      return;
    }
    callReject(trimmed);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-10 relative overflow-hidden">
      <div className="absolute top-6 left-6 sm:top-8 sm:left-10">
        <img src="/images/logo-thaco.png" alt="THACO" className="h-8 object-contain select-none" />
      </div>

      <div className="w-full max-w-[480px] flex flex-col items-center text-center">
        {pageStatus === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 size={40} className="animate-spin text-blue-500" />
            <p className="text-[13.5px] font-medium text-slate-500 dark:text-slate-400">{t('public_action.processing')}</p>
          </div>
        )}

        {pageStatus === 'reject_reason' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 size={36} className="animate-spin text-slate-400" />
            <p className="text-[13.5px] font-medium text-slate-500 dark:text-slate-400">{t('public_action.waiting_reason')}</p>
          </div>
        )}

        {(pageStatus === 'success' || pageStatus === 'error') && (
          <>
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-lg ${
                isSuccessAction
                  ? 'bg-emerald-500 shadow-emerald-500/25'
                  : isExpired
                  ? 'bg-amber-500 shadow-amber-500/25'
                  : 'bg-rose-500 shadow-rose-500/25'
              }`}
            >
              {isSuccessAction ? (
                <CheckCircle2 size={42} className="text-white" strokeWidth={2.2} />
              ) : isExpired ? (
                <AlertTriangle size={38} className="text-white" strokeWidth={2.2} />
              ) : (
                <XCircle size={42} className="text-white" strokeWidth={2.2} />
              )}
            </div>

            <h1
              className={`text-xl font-bold mb-2 tracking-tight ${
                isSuccessAction ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {title}
            </h1>

            <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed px-2">{message}</p>

            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 font-medium">
              {t('public_action.redirect_prefix')} <span className="text-blue-500 font-semibold">{countdown}</span>{' '}
              {t('public_action.redirect_suffix')}
            </p>

            <Button variant="primary" size="md" onClick={() => navigate('/')}>
              {t('public_action.go_home')}
            </Button>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-8">
              {t('public_action.auto_email_note')}
            </p>
          </>
        )}
      </div>

      <Modal
        open={pageStatus === 'reject_reason'}
        onCancel={handleCancelReject}
        footer={null}
        centered
        mask={{ closable: false }}
        keyboard={false}
        width={460}
        destroyOnHidden
        closeIcon={<XCircle size={18} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />}
        className="[&_.ant-modal-content]:!p-6 [&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border [&_.ant-modal-content]:!border-slate-100 dark:[&_.ant-modal-content]:!border-slate-800 [&_.ant-modal-content]:!bg-white dark:[&_.ant-modal-content]:!bg-slate-900 [&_.ant-modal-content]:!shadow-2xl"
      >
        <div className="flex flex-col gap-4.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 shrink-0 shadow-xs">
              <CalendarX size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {t(REJECT_TITLE_KEY[kind])}
              </h3>
              <p className="text-13 text-slate-500 dark:text-slate-400">{t('public_action.reject_reason_hint')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13.5px] font-semibold text-slate-700 dark:text-slate-200">
              {t('public_action.reject_reason_label')} <span className="text-rose-500">*</span>
            </label>
            <Input.TextArea
              rows={3.5}
              maxLength={500}
              showCount
              placeholder={t('public_action.reject_reason_placeholder')}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonTouched && e.target.value.trim()) setReasonTouched(false);
              }}
              onBlur={() => setReasonTouched(true)}
              className={`!rounded-2xl !text-[13.5px] font-normal dark:!bg-slate-900 dark:!text-slate-100 transition-all duration-200 ${
                reasonTouched && !reason.trim()
                  ? '!border-rose-400 dark:!border-rose-500 focus:!border-rose-500'
                  : 'border-slate-200 dark:border-slate-700 hover:border-rose-400 focus:border-rose-500'
              }`}
            />
            {reasonTouched && !reason.trim() && (
              <span className="text-xs font-medium text-rose-500 pl-1 mt-0.5">{t('public_action.reject_reason_required')}</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button variant="outline" onClick={handleCancelReject} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleConfirmReject} loading={isSubmitting}>
              {t('public_action.reject_confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PublicScheduleActionPage;

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { signalRService } from '../services/signalr/SignalRService';
import toast from '../store/toastStore';
import type { INotification } from '../services/api/notificationAPI';
import { getNotificationDisplay } from '../constants/notificationCodes';

const SCHEDULE_QUERY_KEY_PREFIXES: string[] = [
  'personal-schedule',
  'personal-schedule-detail',
  'leadership-schedule-requests',
  'leadership-schedule-detail',
  'leadership-schedule-stats',
  'leadership-schedule-calendar-grid',
  'meeting-invitations',
  'meeting-invitation-stats',
  'meeting-invitation-calendar-grid',
  'schedule-approvals',
  'schedule-approval-stats',
  'schedule-calendar-overview',
  'single-schedule-occurrence-invitation',
  'single-schedule-occurrence-approval',
  'overview-occurrence-detail',
];

export const useSignalR = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    const handleNotification = (notification: INotification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-total-unread'] });

      if (notification.code?.startsWith('schedule.')) {
        SCHEDULE_QUERY_KEY_PREFIXES.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }

      const display = getNotificationDisplay(tRef.current, notification.code, notification.title, notification.content);
      toast.info(display.message, display.title || tRef.current('notifications_dropdown.new_notification'));
    };

    const unsubscribe = signalRService.subscribe(handleNotification);
    return unsubscribe;
  }, [queryClient]);
};

export default useSignalR;

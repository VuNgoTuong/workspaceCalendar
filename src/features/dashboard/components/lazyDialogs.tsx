import { lazy, useRef } from 'react';

export const LazyScheduleDetailModal = lazy(() =>
  import('./ScheduleDetailModal').then((m) => ({ default: m.ScheduleDetailModal }))
);
export const LazyRejectDialog = lazy(() =>
  import('../../work-schedule/PheDuyetLich/ScheduleApproval').then((m) => ({ default: m.RejectDialog }))
);
export const LazyDeclineAttendanceDialog = lazy(() =>
  import('../../work-schedule/LichMoiThamDu/MeetingInvitations').then((m) => ({ default: m.DeclineAttendanceDialog }))
);

export const useMountedOnce = (open: boolean) => {
  const mounted = useRef(false);
  if (open) mounted.current = true;
  return mounted.current;
};

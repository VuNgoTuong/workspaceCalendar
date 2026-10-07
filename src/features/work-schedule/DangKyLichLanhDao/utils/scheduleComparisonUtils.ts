import dayjs, { type Dayjs } from 'dayjs';
import type { IBusyCalendarOccurrence, IUserAvailability } from '../../../../services/api/scheduleOccurrenceAPI';
import { fromApiDateTime } from '../../../../utils/dateTime';
import { ScheduleCategory } from '../../../../constants/scheduleCategory';
import { ScheduleOccurrenceStatus } from '../../../../constants/scheduleOccurrenceStatus';

export const WINDOW_START_MIN = 7 * 60; // 07:00
export const WINDOW_END_MIN = 17 * 60 + 30; // 17:30
export const WINDOW_SPAN = WINDOW_END_MIN - WINDOW_START_MIN;
export const HOUR_PX = 64;
export const TRACK_HEIGHT = (WINDOW_SPAN / 60) * HOUR_PX;
export const MIN_BLOCK_HEIGHT = 16;

export const toMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const toTime = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const minutesToTop = (minutes: number): number =>
  ((minutes - WINDOW_START_MIN) / 60) * HOUR_PX;

export interface BusyTimeRange {
  start: number;
  end: number;
  occurrence?: IBusyCalendarOccurrence;
}

export interface FreeSlotItem {
  start: number;
  end: number;
  startStr: string;
  endStr: string;
  durationMinutes: number;
}

export interface LeaderFreeRequesterBusyItem {
  start: number;
  end: number;
  startStr: string;
  endStr: string;
  durationMinutes: number;
  conflictingOccurrence?: IBusyCalendarOccurrence;
}

export interface ScheduleComparisonResult {
  /** Khoảng thời gian cả Lãnh đạo & Cá nhân đều rảnh (Lịch trống => gợi ý tạo lịch) */
  mutualFreeSlots: FreeSlotItem[];
  /** Khoảng thời gian Lãnh đạo trống nhưng Cá nhân đã có lịch (show nhẹ) */
  leaderFreeRequesterBusySlots: LeaderFreeRequesterBusyItem[];
  /** Danh sách gợi ý khung giờ chuẩn (30m, 45m, 60m...) */
  suggestedPicks: { start: string; end: string; duration: number }[];
}

/** Hợp nhất các dải bận bị chồng lấn */
export const mergeBusyRanges = (ranges: BusyTimeRange[]): BusyTimeRange[] => {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: BusyTimeRange[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.start <= prev.end) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }
  return merged;
};

/** Lấy danh sách khoảng thời gian bận trong ngày làm việc */
export const extractBusyRanges = (
  occurrences: IBusyCalendarOccurrence[],
  date: Dayjs
): BusyTimeRange[] => {
  const winStart = date.startOf('day').add(WINDOW_START_MIN, 'minute');
  const winEnd = date.startOf('day').add(WINDOW_END_MIN, 'minute');

  return occurrences
    .map((occ): BusyTimeRange | null => {
      const start = fromApiDateTime(occ.startDate);
      const end = fromApiDateTime(occ.endDate);
      const clippedStart = start.isBefore(winStart) ? winStart : start;
      const clippedEnd = end.isAfter(winEnd) ? winEnd : end;
      if (!clippedEnd.isAfter(clippedStart)) return null;

      const startMin = clippedStart.diff(winStart, 'minute') + WINDOW_START_MIN;
      const endMin = clippedEnd.diff(winStart, 'minute') + WINDOW_START_MIN;
      return {
        start: startMin,
        end: endMin,
        occurrence: occ,
      };
    })
    .filter((r): r is BusyTimeRange => !!r);
};

/** Tính toán đối chiếu lịch giữa Lãnh đạo và Cá nhân */
export const computeScheduleComparison = (
  leaderOccurrences: IBusyCalendarOccurrence[],
  requesterOccurrences: IBusyCalendarOccurrence[],
  date: Dayjs,
  preferredDuration = 30
): ScheduleComparisonResult => {
  const leaderRanges = extractBusyRanges(leaderOccurrences, date);
  const requesterRanges = extractBusyRanges(requesterOccurrences, date);

  const mergedLeaderBusy = mergeBusyRanges(leaderRanges);

  // Tìm các khoảng Lãnh đạo rảnh trong [WINDOW_START_MIN, WINDOW_END_MIN]
  const leaderFreeIntervals: { start: number; end: number }[] = [];
  let cur = WINDOW_START_MIN;

  for (const lb of mergedLeaderBusy) {
    if (lb.start > cur) {
      leaderFreeIntervals.push({ start: cur, end: lb.start });
    }
    cur = Math.max(cur, lb.end);
  }
  if (cur < WINDOW_END_MIN) {
    leaderFreeIntervals.push({ start: cur, end: WINDOW_END_MIN });
  }

  const mutualFreeSlots: FreeSlotItem[] = [];
  const leaderFreeRequesterBusySlots: LeaderFreeRequesterBusyItem[] = [];

  // Với từng khoảng Lãnh đạo rảnh, đối chiếu với lịch của Cá nhân (requester)
  for (const freeInt of leaderFreeIntervals) {
    // Tìm các requester occurrence giao với freeInt
    const overlappingReq = requesterRanges.filter(
      (r) => r.start < freeInt.end && r.end > freeInt.start
    );

    if (overlappingReq.length === 0) {
      // Cả 2 cùng rảnh toàn bộ khoảng này
      const dur = freeInt.end - freeInt.start;
      if (dur >= 15) {
        mutualFreeSlots.push({
          start: freeInt.start,
          end: freeInt.end,
          startStr: toTime(freeInt.start),
          endStr: toTime(freeInt.end),
          durationMinutes: dur,
        });
      }
    } else {
      // Có phần cá nhân bận
      // Duyệt qua từng mốc để phân tách đoạn cả 2 rảnh và đoạn cá nhân bận
      const mergedOverlappingReq = mergeBusyRanges(
        overlappingReq.map((r) => ({
          start: Math.max(freeInt.start, r.start),
          end: Math.min(freeInt.end, r.end),
          occurrence: r.occurrence,
        }))
      );

      let subCur = freeInt.start;
      for (const reqBusy of mergedOverlappingReq) {
        if (reqBusy.start > subCur) {
          const dur = reqBusy.start - subCur;
          if (dur >= 15) {
            mutualFreeSlots.push({
              start: subCur,
              end: reqBusy.start,
              startStr: toTime(subCur),
              endStr: toTime(reqBusy.start),
              durationMinutes: dur,
            });
          }
        }
        // Đoạn Lãnh đạo rảnh nhưng Cá nhân bận
        const busyDur = reqBusy.end - reqBusy.start;
        if (busyDur >= 15) {
          // Tìm occurrence tương ứng
          const origOcc = overlappingReq.find(
            (o) => o.start < reqBusy.end && o.end > reqBusy.start
          )?.occurrence;

          leaderFreeRequesterBusySlots.push({
            start: reqBusy.start,
            end: reqBusy.end,
            startStr: toTime(reqBusy.start),
            endStr: toTime(reqBusy.end),
            durationMinutes: busyDur,
            conflictingOccurrence: origOcc,
          });
        }
        subCur = Math.max(subCur, reqBusy.end);
      }

      if (subCur < freeInt.end) {
        const dur = freeInt.end - subCur;
        if (dur >= 15) {
          mutualFreeSlots.push({
            start: subCur,
            end: freeInt.end,
            startStr: toTime(subCur),
            endStr: toTime(freeInt.end),
            durationMinutes: dur,
          });
        }
      }
    }
  }

  // Tạo danh sách gợi ý slot chuẩn theo thời lượng
  const suggestedPicks: { start: string; end: string; duration: number }[] = [];
  const step = 30;

  for (const slot of mutualFreeSlots) {
    if (slot.durationMinutes >= preferredDuration) {
      let slotTime = slot.start;
      while (slotTime + preferredDuration <= slot.end && suggestedPicks.length < 8) {
        suggestedPicks.push({
          start: toTime(slotTime),
          end: toTime(slotTime + preferredDuration),
          duration: preferredDuration,
        });
        slotTime += step;
      }
    }
  }

  return {
    mutualFreeSlots,
    leaderFreeRequesterBusySlots,
    suggestedPicks,
  };
};

/** Phân loại hiển thị lịch của Lãnh đạo */
export interface OccurrenceClassification {
  categoryLabelKey: string;
  categoryType: 'personal' | 'invitation' | 'registration';
  statusLabelKey: string;
  statusBadgeVariant: 'success' | 'warning' | 'neutral' | 'slate' | 'rose';
  isMasked: boolean;
}

export const classifyLeaderOccurrence = (
  occ: IBusyCalendarOccurrence
): OccurrenceClassification => {
  const isMasked = occ.isConfidential && !occ.canViewDetail;

  if (isMasked) {
    return {
      categoryLabelKey: 'leadership_schedule.masked_schedule',
      categoryType: 'personal',
      statusLabelKey: 'leadership_schedule.cmp_status_private',
      statusBadgeVariant: 'neutral',
      isMasked: true,
    };
  }

  // 1. Lịch đăng ký đến Lãnh đạo
  if (occ.scheduleCategory === ScheduleCategory.LeaderRegistration) {
    let statusLabelKey = 'status.pending';
    let statusBadgeVariant: 'success' | 'warning' | 'neutral' | 'slate' | 'rose' = 'warning';

    if (occ.status === ScheduleOccurrenceStatus.Approved) {
      statusLabelKey = 'status.approved';
      statusBadgeVariant = 'success';
    } else if (occ.status === ScheduleOccurrenceStatus.Rejected) {
      statusLabelKey = 'status.rejected';
      statusBadgeVariant = 'rose';
    } else if (occ.status === ScheduleOccurrenceStatus.Cancelled) {
      statusLabelKey = 'status.cancelled';
      statusBadgeVariant = 'neutral';
    }

    return {
      categoryLabelKey: 'schedule_category.leader_registration',
      categoryType: 'registration',
      statusLabelKey,
      statusBadgeVariant,
      isMasked: false,
    };
  }

  // 2. Lịch lãnh đạo được mời tham dự (nếu có trường hoặc theo title/notes)
  const isInvitation =
    (occ as any).isInvitation ||
    (occ as any).participantStatus !== undefined ||
    (occ.title && occ.title.toLowerCase().includes('mời'));

  if (isInvitation) {
    const pStatus = (occ as any).participantStatus;
    let statusLabelKey = 'participation_status.accepted';
    let statusBadgeVariant: 'success' | 'warning' | 'neutral' | 'slate' | 'rose' = 'success';

    if (pStatus === 1 || pStatus === undefined) {
      statusLabelKey = 'participation_status.waiting';
      statusBadgeVariant = 'warning';
    } else if (pStatus === 3) {
      statusLabelKey = 'participation_status.rejected';
      statusBadgeVariant = 'rose';
    }

    return {
      categoryLabelKey: 'schedule_category.invitation',
      categoryType: 'invitation',
      statusLabelKey,
      statusBadgeVariant,
      isMasked: false,
    };
  }

  // 3. Lịch cá nhân lãnh đạo
  return {
    categoryLabelKey: 'schedule_category.leader_personal',
    categoryType: 'personal',
    statusLabelKey: occ.status === ScheduleOccurrenceStatus.Approved ? 'status.approved' : 'schedule_category.personal',
    statusBadgeVariant: 'slate',
    isMasked: false,
  };
};

export interface ConflictDetailInfo {
  hasConflict: boolean;
  conflictSource: 'requester' | 'leader' | 'both' | 'none';
  date: string;
  start: string;
  end: string;
  requesterConflictRange?: { start: string; end: string };
  leaderConflictRange?: { start: string; end: string };
  requesterName?: string;
  leaderName?: string;
}

export const checkDetailedAvailabilityConflict = (
  availability: IUserAvailability[],
  dates: string | string[],
  startTime: string,
  endTime: string,
  requesterId?: string,
  leaderId?: string
): ConflictDetailInfo => {
  const checkDates = Array.isArray(dates) ? dates : [dates];

  let hasLeaderConflict = false;
  let hasRequesterConflict = false;
  let leaderConflictRange: { start: string; end: string } | undefined;
  let requesterConflictRange: { start: string; end: string } | undefined;
  let conflictDate = checkDates[0] || '';

  for (const date of checkDates) {
    const candidateStart = dayjs(`${date}T${startTime}:00`);
    const candidateEnd = dayjs(`${date}T${endTime}:00`);

    for (const user of availability) {
      const day = user.days.find((d) => d.date === date);
      if (!day) continue;

      const hit = day.busyTimes.find(
        (b) =>
          fromApiDateTime(b.startDate).isBefore(candidateEnd) &&
          candidateStart.isBefore(fromApiDateTime(b.endDate))
      );

      if (hit) {
        conflictDate = date;
        const startStr = fromApiDateTime(hit.startDate).format('HH:mm');
        const endStr = fromApiDateTime(hit.endDate).format('HH:mm');

        if (user.userId === requesterId) {
          hasRequesterConflict = true;
          requesterConflictRange = { start: startStr, end: endStr };
        } else if (user.userId === leaderId) {
          hasLeaderConflict = true;
          leaderConflictRange = { start: startStr, end: endStr };
        } else {
          // Khác (ví dụ participant)
          hasLeaderConflict = true;
          leaderConflictRange = { start: startStr, end: endStr };
        }
      }
    }
  }

  const hasConflict = hasLeaderConflict || hasRequesterConflict;
  let conflictSource: 'requester' | 'leader' | 'both' | 'none' = 'none';

  if (hasLeaderConflict && hasRequesterConflict) {
    conflictSource = 'both';
  } else if (hasRequesterConflict) {
    conflictSource = 'requester';
  } else if (hasLeaderConflict) {
    conflictSource = 'leader';
  }

  const activeRange = requesterConflictRange || leaderConflictRange || { start: startTime, end: endTime };

  return {
    hasConflict,
    conflictSource,
    date: conflictDate,
    start: activeRange.start,
    end: activeRange.end,
    requesterConflictRange,
    leaderConflictRange,
  };
};

/** Below this height a two-line (time + title) layout no longer fits, so blocks fall back to a single compact line. */
export const COMPACT_BLOCK_HEIGHT = 34;

export const blockFontSize = (heightPx: number, widthPct: number) => {
  const heightT = Math.min(1, Math.max(0, (heightPx - MIN_BLOCK_HEIGHT) / (100 - MIN_BLOCK_HEIGHT)));
  const base = 10 + heightT * (13.5 - 10);
  const widthFactor = Math.min(1, Math.max(0.8, widthPct / 100));
  return Math.round(base * widthFactor * 10) / 10;
};

export interface BusyBlock {
  occurrence: IBusyCalendarOccurrence;
  topPx: number;
  heightPx: number;
  leftPct: number;
  widthPct: number;
}

const layoutOverlappingBlocks = (
  blocks: { occurrence: IBusyCalendarOccurrence; topPx: number; heightPx: number }[]
): BusyBlock[] => {
  const sorted = [...blocks].sort((a, b) => a.topPx - b.topPx || a.heightPx - b.heightPx);
  const result: BusyBlock[] = [];
  let cluster: typeof sorted = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const laneOf: number[] = [];
    cluster.forEach((b) => {
      let lane = laneEnds.findIndex((end) => end <= b.topPx);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(b.topPx + b.heightPx);
      } else {
        laneEnds[lane] = b.topPx + b.heightPx;
      }
      laneOf.push(lane);
    });
    const totalLanes = laneEnds.length;
    cluster.forEach((b, i) => {
      result.push({ ...b, leftPct: (laneOf[i] / totalLanes) * 100, widthPct: 100 / totalLanes });
    });
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const b of sorted) {
    if (cluster.length > 0 && b.topPx >= clusterEnd) flushCluster();
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.topPx + b.heightPx);
  }
  flushCluster();

  return result;
};

/** Positions the occurrences that fall inside `date`'s working window as timeline blocks (overlaps share the width in lanes). */
export const buildBlocks = (occurrences: IBusyCalendarOccurrence[], date: Dayjs): BusyBlock[] =>
  layoutOverlappingBlocks(
    extractBusyRanges(occurrences, date).map((r) => ({
      occurrence: r.occurrence!,
      topPx: minutesToTop(r.start),
      heightPx: Math.max(minutesToTop(r.end) - minutesToTop(r.start), MIN_BLOCK_HEIGHT),
    }))
  );

/** Monday of the week containing `date` (the calendar views always start weeks on Monday). */
export const startOfWeekMonday = (date: Dayjs): Dayjs => date.startOf('day').subtract((date.day() + 6) % 7, 'day');

/** Occurrences that overlap the given calendar day at all (multi-day schedules show on every day they cover). */
export const occurrencesOnDay = (occurrences: IBusyCalendarOccurrence[], date: Dayjs): IBusyCalendarOccurrence[] => {
  const dayStart = date.startOf('day');
  const dayEnd = dayStart.add(1, 'day');
  return occurrences
    .filter((occ) => fromApiDateTime(occ.startDate).isBefore(dayEnd) && fromApiDateTime(occ.endDate).isAfter(dayStart))
    .sort((a, b) => fromApiDateTime(a.startDate).valueOf() - fromApiDateTime(b.startDate).valueOf());
};

import dayjs from 'dayjs';
import { MEETING_WINDOW_START, MEETING_WINDOW_END } from '../../../../constants/workingHours';
import type { IUserAvailability } from '../../../../services/api/scheduleOccurrenceAPI';
import { fromApiDateTime } from '../../../../utils/dateTime';
import type { TimeSlot } from '../../DangKyLichLanhDao/utils/timeSlots';
import type { PersonalScheduleEvent } from '../types';

const STEP_MIN = 30;

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const toTime = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

const clipToDay = (startIso: string, endIso: string, date: string): { start: number; end: number } | null => {
  const dayStart = dayjs(`${date}T00:00:00`);
  const dayEnd = dayStart.add(1, 'day');
  const start = fromApiDateTime(startIso);
  const end = fromApiDateTime(endIso);
  if (!end.isAfter(dayStart) || !start.isBefore(dayEnd)) return null;
  const clippedStart = start.isBefore(dayStart) ? dayStart : start;
  const clippedEnd = end.isAfter(dayEnd) ? dayEnd : end;
  return { start: clippedStart.diff(dayStart, 'minute'), end: clippedEnd.diff(dayStart, 'minute') };
};

export function buildDayAvailabilitySlots(availability: IUserAvailability[], date: string): TimeSlot[] {
  const busyRanges = availability
    .flatMap((user) => user.days.find((d) => d.date === date)?.busyTimes ?? [])
    .map((b) => clipToDay(b.startDate, b.endDate, date))
    .filter((r): r is { start: number; end: number } => !!r);

  const slots: TimeSlot[] = [];
  let cursor = toMinutes(MEETING_WINDOW_START);
  const end = toMinutes(MEETING_WINDOW_END);
  while (cursor < end) {
    const slotEnd = cursor + STEP_MIN;
    const busy = busyRanges.some((r) => r.start < slotEnd && cursor < r.end);
    slots.push({ start: toTime(cursor), available: !busy });
    cursor += STEP_MIN;
  }
  return slots;
}

export function markSlotsBusyFromLocalEvents(
  slots: TimeSlot[],
  events: PersonalScheduleEvent[],
  date: string,
  excludeId?: string
): TimeSlot[] {
  const busyRanges = events
    .filter((ev) => (!excludeId || ev.id !== excludeId) && ev.startDate <= date && ev.endDate >= date)
    .map((ev) => ({ start: toMinutes(ev.startTime), end: toMinutes(ev.endTime) }));
  if (!busyRanges.length) return slots;

  return slots.map((slot) => {
    if (!slot.available) return slot;
    const slotStart = toMinutes(slot.start);
    const slotEnd = slotStart + STEP_MIN;
    const overlaps = busyRanges.some((r) => r.start < slotEnd && slotStart < r.end);
    return overlaps ? { ...slot, available: false } : slot;
  });
}

export function findConflictingUsers(
  availability: IUserAvailability[],
  date: string,
  startTime: string,
  endTime: string
): IUserAvailability[] {
  const candidateStart = dayjs(`${date}T${startTime}:00`);
  const candidateEnd = dayjs(`${date}T${endTime}:00`);
  return availability.filter((user) => {
    const day = user.days.find((d) => d.date === date);
    if (!day) return false;
    return day.busyTimes.some(
      (b) => fromApiDateTime(b.startDate).isBefore(candidateEnd) && candidateStart.isBefore(fromApiDateTime(b.endDate))
    );
  });
}

/** Checks the same start/end time-of-day across one or more dates (a multi-day/repeat schedule
 *  repeats the same daily time window) — returns the first date+range that's already busy. */
export function findConflictingBusyRange(
  availability: IUserAvailability[],
  dates: string | string[],
  startTime: string,
  endTime: string
): { date: string; start: string; end: string } | null {
  for (const date of Array.isArray(dates) ? dates : [dates]) {
    const candidateStart = dayjs(`${date}T${startTime}:00`);
    const candidateEnd = dayjs(`${date}T${endTime}:00`);
    for (const user of availability) {
      const day = user.days.find((d) => d.date === date);
      if (!day) continue;
      const hit = day.busyTimes.find(
        (b) => fromApiDateTime(b.startDate).isBefore(candidateEnd) && candidateStart.isBefore(fromApiDateTime(b.endDate))
      );
      if (hit) {
        return { date, start: fromApiDateTime(hit.startDate).format('HH:mm'), end: fromApiDateTime(hit.endDate).format('HH:mm') };
      }
    }
  }
  return null;
}

import dayjs from 'dayjs';
import { MEETING_WINDOW_START, MEETING_WINDOW_END } from '../../../../constants/workingHours';
import type { PersonalScheduleEvent } from '../types';

export interface ConflictCandidate {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

export interface ConflictResult {
  event: PersonalScheduleEvent;
  overlapDate: string;
}

export interface FreeSlot {
  start: string;
  end: string;
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const toTime = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);

const eachDate = (start: string, end: string): string[] => {
  if (!start || !end) return [];
  const days: string[] = [];
  let cur = dayjs(start);
  const last = dayjs(end);
  let guard = 0;
  while (!cur.isAfter(last) && guard < 366) {
    days.push(cur.format('YYYY-MM-DD'));
    cur = cur.add(1, 'day');
    guard += 1;
  }
  return days;
};

const windowStartFor = (day: string, windowStart: number) => {
  if (day !== dayjs().format('YYYY-MM-DD')) return windowStart;
  const nowMin = dayjs().hour() * 60 + dayjs().minute();
  return Math.max(windowStart, nowMin);
};

function effectiveRangeForDay(ev: ConflictCandidate, day: string): { start: number; end: number } | null {
  const start = day === ev.startDate ? toMinutes(ev.startTime) : 0;
  const end = day === ev.endDate ? toMinutes(ev.endTime) : 24 * 60;
  return end > start ? { start, end } : null;
}

export function isEventActiveOnDay(ev: ConflictCandidate, day: string): boolean {
  return effectiveRangeForDay(ev, day) !== null;
}

const dedupeSlots = (slots: FreeSlot[]): FreeSlot[] => {
  const seen = new Set<string>();
  return slots.filter((s) => {
    const key = `${s.start}-${s.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function findConflict(
  candidate: ConflictCandidate,
  existing: PersonalScheduleEvent[],
  excludeId?: string
): ConflictResult | null {
  if (!candidate.startDate || !candidate.endDate || !candidate.startTime || !candidate.endTime) return null;
  const candidateDays = new Set(eachDate(candidate.startDate, candidate.endDate));

  for (const ev of existing) {
    if (excludeId && ev.id === excludeId) continue;
    const sharedDay = eachDate(ev.startDate, ev.endDate).find((d) => candidateDays.has(d));
    if (!sharedDay) continue;
    if (rangesOverlap(candidate.startTime, candidate.endTime, ev.startTime, ev.endTime)) {
      return { event: ev, overlapDate: sharedDay };
    }
  }
  return null;
}

export function suggestFreeSlots(
  candidate: ConflictCandidate,
  existing: PersonalScheduleEvent[],
  excludeId?: string,
  maxSuggestions = 2
): FreeSlot[] {
  if (!candidate.startDate || !candidate.startTime || !candidate.endTime) return [];
  const durationMin = Math.max(15, toMinutes(candidate.endTime) - toMinutes(candidate.startTime));

  const day = candidate.startDate;
  const seenIds = new Set<string>();
  const busy = existing
    .filter((ev) => (!excludeId || ev.id !== excludeId) && eachDate(ev.startDate, ev.endDate).includes(day))
    .filter((ev) => (seenIds.has(ev.id) ? false : (seenIds.add(ev.id), true)))
    .map((ev) => effectiveRangeForDay(ev, day))
    .filter((range): range is { start: number; end: number } => range !== null)
    .sort((a, b) => a.start - b.start);

  const slots: FreeSlot[] = [];
  let cursor = windowStartFor(day, toMinutes(MEETING_WINDOW_START));
  const dayEnd = toMinutes(MEETING_WINDOW_END);

  for (const b of busy) {
    if (b.start - cursor >= durationMin) {
      slots.push({ start: toTime(cursor), end: toTime(cursor + durationMin) });
    }
    cursor = Math.max(cursor, b.end);
  }
  if (dayEnd - cursor >= durationMin) {
    slots.push({ start: toTime(cursor), end: toTime(cursor + durationMin) });
  }
  return dedupeSlots(slots).slice(0, maxSuggestions);
}

export function listFreeSlots(day: string, existing: PersonalScheduleEvent[], minDurationMin = 30): FreeSlot[] {
  if (!day) return [];
  const seenIds = new Set<string>();
  const busy = existing
    .filter((ev) => eachDate(ev.startDate, ev.endDate).includes(day))
    .filter((ev) => (seenIds.has(ev.id) ? false : (seenIds.add(ev.id), true)))
    .map((ev) => effectiveRangeForDay(ev, day))
    .filter((range): range is { start: number; end: number } => range !== null)
    .sort((a, b) => a.start - b.start);

  const slots: FreeSlot[] = [];
  let cursor = windowStartFor(day, toMinutes(MEETING_WINDOW_START));
  const dayEnd = toMinutes(MEETING_WINDOW_END);

  for (const b of busy) {
    const availableEnd = b.start;
    if (availableEnd - cursor >= minDurationMin) {
      slots.push({ start: toTime(cursor), end: toTime(availableEnd) });
    }
    cursor = Math.max(cursor, b.end);
  }
  if (dayEnd - cursor >= minDurationMin) {
    slots.push({ start: toTime(cursor), end: toTime(dayEnd) });
  }
  return dedupeSlots(slots);
}

export function totalFreeMinutes(day: string, existing: PersonalScheduleEvent[], fromTime?: string): number {
  const slots = listFreeSlots(day, existing, 1);
  const lowerBound = fromTime ? toMinutes(fromTime) : toMinutes(MEETING_WINDOW_START);
  return slots.reduce((sum, slot) => {
    const start = Math.max(toMinutes(slot.start), lowerBound);
    const end = toMinutes(slot.end);
    return sum + Math.max(0, end - start);
  }, 0);
}

export interface ConflictPair {
  a: PersonalScheduleEvent;
  b: PersonalScheduleEvent;
  overlapDate: string;
}

export function findAllConflicts(events: PersonalScheduleEvent[]): ConflictPair[] {
  const pairs: ConflictPair[] = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      const bDays = new Set(eachDate(b.startDate, b.endDate));
      const sharedDay = eachDate(a.startDate, a.endDate).find((d) => bDays.has(d));
      if (!sharedDay) continue;
      if (rangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
        pairs.push({ a, b, overlapDate: sharedDay });
      }
    }
  }
  return pairs;
}

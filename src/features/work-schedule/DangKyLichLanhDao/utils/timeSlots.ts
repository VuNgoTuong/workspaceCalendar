const STEP_MIN = 30;

export interface TimeSlot {
  /** HH:mm */
  start: string;
  available: boolean;
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const toTime = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export function isRangeAvailable(slots: TimeSlot[], start: string, durationMinutes: number): boolean {
  const startMin = toMinutes(start);
  const endMin = startMin + durationMinutes;
  const gridEnd = slots.length ? toMinutes(slots[slots.length - 1].start) + STEP_MIN : endMin;
  return (
    endMin <= gridEnd &&
    slots.every((slot) => {
      const slotStart = toMinutes(slot.start);
      const slotEnd = slotStart + STEP_MIN;
      const overlaps = slotStart < endMin && startMin < slotEnd;
      return !overlaps || slot.available;
    })
  );
}

const findFreeBlocks = (slots: TimeSlot[]): { start: number; end: number }[] => {
  const blocks: { start: number; end: number }[] = [];
  let runStart: number | null = null;
  for (const slot of slots) {
    const slotStart = toMinutes(slot.start);
    if (slot.available) {
      if (runStart === null) runStart = slotStart;
    } else if (runStart !== null) {
      blocks.push({ start: runStart, end: slotStart });
      runStart = null;
    }
  }
  if (runStart !== null) blocks.push({ start: runStart, end: toMinutes(slots[slots.length - 1].start) + STEP_MIN });
  return blocks;
};

export function findPreferredSlot(slots: TimeSlot[], durationMinutes: number): string | null {
  const candidates = findFreeBlocks(slots)
    .filter((b) => b.end - b.start >= durationMinutes)
    .sort((a, b) => (a.end - a.start) - (b.end - b.start) || a.start - b.start);
  return candidates.length ? toTime(candidates[0].start) : null;
}

const evenlySampleIndices = (count: number, take: number): number[] => {
  if (take >= count) return Array.from({ length: count }, (_, i) => i);
  if (take <= 1) return [0];
  const step = (count - 1) / (take - 1);
  const picked = new Set<number>();
  for (let i = 0; i < take; i++) picked.add(Math.round(i * step));
  return Array.from(picked).sort((a, b) => a - b);
};

export function rankSuggestedSlots(slots: TimeSlot[], durationMinutes: number, limit: number): string[] {
  const blocks = findFreeBlocks(slots)
    .filter((b) => b.end - b.start >= durationMinutes)
    .sort((a, b) => (a.end - a.start) - (b.end - b.start) || a.start - b.start);
  if (!blocks.length) return [];

  const perBlockShare = Math.max(1, Math.ceil(limit / blocks.length));
  const picks: number[] = [];
  for (const block of blocks) {
    if (picks.length >= limit) break;
    const positions = Math.floor((block.end - block.start - durationMinutes) / STEP_MIN) + 1;
    const take = Math.min(perBlockShare, positions, limit - picks.length);
    for (const idx of evenlySampleIndices(positions, take)) picks.push(block.start + idx * STEP_MIN);
  }
  return picks.sort((a, b) => a - b).map(toTime);
}

export const computeEndTime = (start: string, durationMinutes: number) => toTime(toMinutes(start) + durationMinutes);

export type EventColorKey = 'blue' | 'green' | 'rose' | 'amber' | 'violet' | 'teal';

export interface EventColorTheme {
  bg: string;
  border: string;
  /** Solid left-accent border used on the thin, soft event cards. */
  accent: string;
  text: string;
  dot: string;
  soft: string;
}

// Executive color palette with badge themes and dark mode styling.
export const EVENT_COLORS: Record<EventColorKey, EventColorTheme> = {
  blue: {
    bg: 'bg-sky-50/90 dark:bg-sky-950/40 hover:bg-sky-100/90 dark:hover:bg-sky-900/50',
    border: 'border-sky-200/80 dark:border-sky-800/60',
    accent: '',
    text: 'text-[#0284C7] dark:text-[#38BDF8]',
    dot: 'bg-[#0284C7]',
    soft: 'bg-[#0284C7]/10 text-[#0284C7] dark:bg-[#0284C7]/20 dark:text-[#38BDF8]',
  },
  green: {
    bg: 'bg-[#ECFDF5] dark:bg-emerald-950/40 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/50',
    border: 'border-[#A7F3D0] dark:border-emerald-800/60',
    accent: '',
    text: 'text-[#10B981] dark:text-[#34D399]',
    dot: 'bg-[#10B981]',
    soft: 'bg-[#10B981]/10 text-[#10B981] dark:bg-[#10B981]/20 dark:text-[#34D399]',
  },
  rose: {
    bg: 'bg-rose-50/90 dark:bg-rose-950/40 hover:bg-rose-100/90 dark:hover:bg-rose-900/50',
    border: 'border-rose-200/80 dark:border-rose-800/60',
    accent: '',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    soft: 'bg-rose-100/80 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
  },
  amber: {
    bg: 'bg-amber-50/90 dark:bg-amber-950/40 hover:bg-amber-100/90 dark:hover:bg-amber-900/50',
    border: 'border-amber-200/80 dark:border-amber-800/60',
    accent: '',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    soft: 'bg-amber-100/80 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  },
  violet: {
    bg: 'bg-violet-50/90 dark:bg-violet-950/40 hover:bg-violet-100/90 dark:hover:bg-violet-900/50',
    border: 'border-violet-200/80 dark:border-violet-800/60',
    accent: '',
    text: 'text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-500',
    soft: 'bg-violet-100/80 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300',
  },
  teal: {
    bg: 'bg-teal-50/90 dark:bg-teal-950/40 hover:bg-teal-100/90 dark:hover:bg-teal-900/50',
    border: 'border-teal-200/80 dark:border-teal-800/60',
    accent: '',
    text: 'text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-500',
    soft: 'bg-teal-100/80 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300',
  },
};

export interface ScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  location?: string;
  attendeeCount?: number;
  color: EventColorKey;
}

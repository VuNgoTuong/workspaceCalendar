import React from 'react';
import { cn } from '../../../utils/helpers';

export type DayPhase = 'morning' | 'afternoon' | 'evening';

export const getDayPhase = (hour: number): DayPhase => (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');

const SKY_GRADIENT: Record<DayPhase, string> = {
  morning:
    'bg-gradient-to-l from-sky-100/90 via-sky-50/50 to-transparent dark:from-sky-500/15 dark:via-sky-400/5',
  afternoon:
    'bg-gradient-to-l from-orange-100/80 via-amber-50/50 to-transparent dark:from-orange-500/15 dark:via-amber-400/5',
  evening:
    'bg-gradient-to-l from-indigo-200/70 via-violet-100/40 to-transparent dark:from-indigo-500/25 dark:via-violet-500/10',
};

const CLOUDS: [string, number, number, number, number, string][] = [
  ['12%', 96, 70, -10, 0.9, '78%'],
  ['48%', 64, 95, -55, 0.7, '62%'],
  ['26%', 128, 120, -80, 0.55, '40%'],
];

const STARS: [string, string, number, number][] = [
  ['14%', '22%', 3, 0],
  ['30%', '9%', 2, 1.2],
  ['62%', '18%', 2.5, 0.6],
  ['20%', '36%', 2, 2.1],
  ['72%', '31%', 3, 1.6],
  ['42%', '44%', 2, 0.3],
  ['10%', '52%', 2.5, 2.6],
  ['56%', '6%', 2, 0.9],
];

const Cloud: React.FC<{ width: number; className?: string; style?: React.CSSProperties }> = ({ width, className, style }) => (
  <svg viewBox="0 0 64 32" width={width} height={width / 2} className={className} style={style} fill="currentColor">
    <path d="M16 30a9 9 0 0 1-1.2-17.92A13 13 0 0 1 39 8.6a10 10 0 0 1 14.6 7A7.5 7.5 0 0 1 51 30H16z" />
  </svg>
);

export const GreetingSky: React.FC<{ phase: DayPhase }> = ({ phase }) => {
  const isNight = phase === 'evening';
  const cloudTone = isNight ? 'text-indigo-100/70 dark:text-slate-500/30' : 'text-white dark:text-slate-300/20';

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={cn('absolute inset-0', SKY_GRADIENT[phase])} />

      {phase === 'morning' && (
        <div className="absolute -top-16 right-[8%] size-48">
          <div className="sky-rays absolute inset-0 rounded-full text-amber-300/50 dark:text-amber-300/25" />
          <div className="sky-pulse absolute inset-[30%] rounded-full bg-amber-200/70 dark:bg-amber-400/25 blur-xl" />
          <div className="absolute inset-[38%] rounded-full bg-gradient-to-br from-yellow-200 to-amber-300 dark:from-amber-300/70 dark:to-orange-400/60 shadow-[0_0_40px_10px_rgba(251,191,36,0.35)]" />
        </div>
      )}

      {phase === 'afternoon' && (
        <div className="absolute -top-10 right-[14%] size-40">
          <div className="sky-rays absolute inset-0 rounded-full text-orange-300/40 dark:text-orange-300/20" />
          <div className="sky-pulse absolute inset-[28%] rounded-full bg-orange-200/70 dark:bg-orange-400/25 blur-xl" />
          <div className="absolute inset-[37%] rounded-full bg-gradient-to-br from-amber-200 to-orange-400 dark:from-amber-300/70 dark:to-rose-400/60 shadow-[0_0_44px_12px_rgba(251,146,60,0.35)]" />
        </div>
      )}

      {isNight && (
        <>
          {STARS.map(([top, right, size, delay], i) => (
            <span
              key={i}
              className="sky-star absolute rounded-full bg-indigo-400 dark:bg-white shadow-[0_0_6px_1px_rgba(129,140,248,0.6)] dark:shadow-[0_0_6px_1px_rgba(255,255,255,0.7)]"
              style={{ top, right, width: size, height: size, animationDelay: `${delay}s` }}
            />
          ))}
          <div className="absolute top-4 right-[12%] size-14">
            <div className="sky-pulse absolute -inset-4 rounded-full bg-indigo-200/60 dark:bg-indigo-300/15 blur-xl" />
            <div className="absolute inset-0 rounded-full shadow-[inset_-10px_6px_0_0_#e0e7ff] dark:shadow-[inset_-10px_6px_0_0_#c7d2fe] rotate-[-20deg]" />
          </div>
        </>
      )}

      {CLOUDS.map(([top, width, duration, delay, opacity, rest], i) => (
        <div
          key={i}
          className="sky-cloud-track"
          style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s`, ['--sky-rest' as string]: rest }}
        >
          <Cloud
            width={width}
            className={cn('absolute left-0 drop-shadow-sm', cloudTone)}
            style={{ top, opacity: isNight ? opacity * 0.6 : opacity }}
          />
        </div>
      ))}
    </div>
  );
};

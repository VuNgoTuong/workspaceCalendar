import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { Tooltip } from '../../../components/ui';
import { cn } from '../../../utils/helpers';
import { EASE_OUT_EXPO, STATUS_TONE, type IconType, type StatusTone } from '../homeTheme';
import { AnimatedNumber } from './HomeBits';

export interface ColumnStat {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
  tone: StatusTone;
  icon: IconType;
  tab?: string;
}

interface StatusColumnsProps {
  stats: ColumnStat[];
  delay?: number;
  onSelect?: (stat: ColumnStat) => void;
}

const PLOT_H = 112;
const STUB_PCT = 4;

export const StatusColumns: React.FC<StatusColumnsProps> = ({ stats, delay = 0, onSelect }) => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const onScreen = useInView(ref, { amount: 0 });
  const loop = inView && onScreen && !reduceMotion;
  const max = Math.max(1, ...stats.map((s) => s.value));
  const cols = { gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` };

  return (
    <div ref={ref} className="flex flex-col gap-2.5">
      <div
        className="grid gap-2.5 items-end border-b border-dashed border-slate-200 dark:border-slate-700"
        style={{ ...cols, height: PLOT_H + 22 }}
      >
        {stats.map((s, i) => {
          const tone = STATUS_TONE[s.tone];
          const pct = s.value === 0 ? STUB_PCT : Math.max(10, (s.value / max) * 100);
          const barDelay = delay + i * 0.1;
          return (
            <div
              key={s.key}
              onClick={
                onSelect
                  ? (e) => {
                      e.stopPropagation();
                      onSelect(s);
                    }
                  : undefined
              }
              className={cn('group/col h-full flex flex-col items-center justify-end gap-1.5', onSelect && 'cursor-pointer')}
            >
              <AnimatedNumber
                value={inView ? s.value : 0}
                className={cn(
                  'text-15 font-semibold leading-none transition-transform duration-200 group-hover/col:-translate-y-1',
                  tone.ink
                )}
              />
              <motion.div
                className="relative w-full max-w-[38px] transition-transform duration-200 ease-out group-hover/col:-translate-y-1 group-hover/col:scale-x-110"
                initial={{ height: 0 }}
                animate={{ height: inView ? (PLOT_H * pct) / 100 : 0 }}
                transition={{ type: 'spring', stiffness: 170, damping: 20, delay: inView ? barDelay : 0 }}
              >
                <span
                  className="absolute inset-0 overflow-hidden rounded-[10px_10px_4px_4px] shadow-[0_6px_14px_-8px_currentColor] transition-[filter] duration-200 group-hover/col:brightness-110"
                  style={{ background: `linear-gradient(180deg, ${tone.light}, ${tone.hex})`, color: tone.hex }}
                >
                  {s.value > 0 && loop && (
                    <motion.span
                      className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-t from-transparent via-white/45 to-transparent will-change-transform"
                      initial={{ y: '165%' }}
                      animate={{ y: ['165%', '-120%'] }}
                      transition={{
                        duration: 1.1,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        repeatDelay: 3.2,
                        delay: barDelay + 1 + i * 0.18,
                      }}
                    />
                  )}
                </span>
              </motion.div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-2.5" style={cols}>
        {stats.map((s, i) => {
          const tone = STATUS_TONE[s.tone];
          const Icon = s.icon;
          return (
            <Tooltip key={s.key} title={`${s.label}: ${s.value}`} placement="bottom">
              <motion.button
                type="button"
                aria-label={`${s.shortLabel}: ${s.value}`}
                disabled={!onSelect}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(s);
                }}
                className="group/stat flex flex-col items-center gap-1 text-center min-w-0 rounded-lg enabled:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00529C]/40"
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  shown: { opacity: 1, y: 0, transition: { duration: 0.35, delay: delay + 0.2 + i * 0.08, ease: EASE_OUT_EXPO } },
                }}
                initial="hidden"
                animate={inView ? 'shown' : 'hidden'}
              >
                <span
                  className={cn(
                    'relative w-[26px] h-[26px] rounded-lg flex items-center justify-center transition-transform duration-200 ease-out group-hover/stat:-translate-y-0.5 group-hover/stat:scale-110',
                    tone.soft,
                    tone.ink
                  )}
                >
                  <Icon size={15} strokeWidth={1.75} />
                </span>
              </motion.button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default StatusColumns;

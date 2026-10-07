import React, { useEffect, useRef } from 'react';
import { motion, animate, useReducedMotion } from 'motion/react';
import { cn } from '../../../utils/helpers';
import { EASE_OUT_EXPO, type IconType } from '../homeTheme';

/** Counts up from the previous value; jumps straight to the value when reduced motion is on. */
export const AnimatedNumber: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = prev.current;
    prev.current = value;
    if (reduceMotion || from === value) {
      node.textContent = value.toLocaleString('vi-VN');
      return;
    }
    const controls = animate(from, value, {
      duration: 0.9,
      ease: EASE_OUT_EXPO,
      onUpdate: (v) => {
        node.textContent = Math.round(v).toLocaleString('vi-VN');
      },
    });
    return () => controls.stop();
  }, [value, reduceMotion]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      0
    </span>
  );
};

export const NumberSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <span className={cn('inline-block h-5 w-10 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse', className)} />
);

export const EmptyState: React.FC<{ icon: IconType; title: string }> = ({ icon: Icon, title }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-10 px-4 text-center"
  >
    <div
      className="dash-bob w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-2.5 shadow-xs"
    >
      <Icon size={22} className="stroke-[1.6]" />
    </div>
    <p className="text-12.5 text-slate-500 dark:text-slate-400 max-w-[260px]">{title}</p>
  </motion.div>
);

/** 40px gradient icon tile used in every dashboard section header. `children` can add a corner badge. */
export const SectionIcon: React.FC<{ icon: IconType; className: string; children?: React.ReactNode }> = ({
  icon: Icon,
  className,
  children,
}) => (
  <div className={cn('relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white', className)}>
    <Icon size={19} />
    {children}
  </div>
);

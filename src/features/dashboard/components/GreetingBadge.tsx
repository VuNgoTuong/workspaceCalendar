import React from 'react';
import { motion } from 'motion/react';
import { Sun, CloudSun, Moon } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import { getDayPhase, type DayPhase } from './GreetingSky';

const PHASE_META: Record<
  DayPhase,
  { icon: typeof Sun; tint: string; badge: string; idle: Record<string, number | number[]>; idleTransition: object }
> = {
  morning: {
    icon: Sun,
    tint: 'text-amber-500',
    badge: 'from-amber-100 to-orange-100 ring-amber-200/70 dark:from-amber-500/20 dark:to-orange-500/10 dark:ring-amber-400/20',
    idle: { rotate: 360 },
    idleTransition: { duration: 18, repeat: Infinity, ease: 'linear' },
  },
  afternoon: {
    icon: CloudSun,
    tint: 'text-orange-500',
    badge: 'from-orange-100 to-rose-100 ring-orange-200/70 dark:from-orange-500/20 dark:to-rose-500/10 dark:ring-orange-400/20',
    idle: { y: [0, -2, 0, -1, 0], rotate: [0, -8, 0, 6, 0], scale: [1, 1.08, 1, 1.04, 1] },
    idleTransition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
  },
  evening: {
    icon: Moon,
    tint: 'text-indigo-500 dark:text-indigo-300',
    badge: 'from-indigo-100 to-violet-100 ring-indigo-200/70 dark:from-indigo-500/20 dark:to-violet-500/10 dark:ring-indigo-400/20',
    idle: { rotate: [0, -12, 0] },
    idleTransition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const GreetingBadge: React.FC<{ className?: string }> = ({ className }) => {
  const meta = PHASE_META[getDayPhase(new Date().getHours())];
  const Icon = meta.icon;

  return (
    <motion.span
      initial={{ rotate: -30, scale: 0, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.25 }}
      className={cn('inline-flex items-center justify-center size-6 rounded-lg bg-gradient-to-br ring-1 shadow-sm', meta.badge, className)}
    >
      <motion.span animate={meta.idle} transition={meta.idleTransition} className="inline-flex">
        <Icon size={14} strokeWidth={2.25} fill="currentColor" fillOpacity={0.25} className={meta.tint} />
      </motion.span>
    </motion.span>
  );
};

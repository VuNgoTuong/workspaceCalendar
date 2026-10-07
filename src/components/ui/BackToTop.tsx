import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from './Tooltip';

const SHOW_AFTER = 320;
const SIZE = 44;
const STROKE = 1.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface BackToTopProps {
  scroller: HTMLElement | null;
}

export const BackToTop: React.FC<BackToTopProps> = ({ scroller }) => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const progress = useMotionValue(0);
  const dashOffset = useTransform(progress, (p) => CIRCUMFERENCE * (1 - p));

  useEffect(() => {
    if (!scroller) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = scroller.scrollHeight - scroller.clientHeight;
      progress.set(max > 0 ? scroller.scrollTop / max : 0);
      setVisible(scroller.scrollTop > SHOW_AFTER);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [scroller, progress]);

  const scrollToTop = () => {
    scroller?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <Tooltip key="back-to-top" title={t('common.back_to_top')} placement="left">
          <motion.button
            key="back-to-top"
            type="button"
            onClick={scrollToTop}
            aria-label={t('common.back_to_top')}
            initial={{ opacity: 0, scale: 0.6, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 12 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            style={{ width: SIZE, height: SIZE }}
            className="group fixed right-6 bottom-24 z-40 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 text-[#00529C] dark:text-blue-400 shadow-[0_10px_24px_-8px_rgba(15,23,42,0.28)] hover:shadow-[0_14px_30px_-8px_rgba(0,82,156,0.4)] cursor-pointer transition-shadow"
          >
            <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90" aria-hidden>
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                className="stroke-slate-200 dark:stroke-slate-700"
              />
              <motion.circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                style={{ strokeDashoffset: dashOffset }}
                className="stroke-[#00529C] dark:stroke-blue-400"
              />
            </svg>
            <ArrowUp size={18} strokeWidth={2.4} className="relative transition-transform duration-200 group-hover:-translate-y-0.5" />
          </motion.button>
        </Tooltip>
      )}
    </AnimatePresence>
  );
};

export default BackToTop;

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronsDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MIN_REMAINING = 80;

const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
  let node = el?.parentElement ?? null;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
};

export const ScrollDownHint: React.FC = () => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [centerX, setCenterX] = useState<number | null>(null);

  useEffect(() => {
    const scroller = findScrollParent(anchorRef.current);
    scrollerRef.current = scroller;
    if (!scroller) return;

    const update = () => {
      const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      setVisible(remaining > MIN_REMAINING);
      const rect = scroller.getBoundingClientRect();
      setCenterX(rect.left + rect.width / 2);
    };

    // Coalesce scroll/resize bursts into one measurement per frame.
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    update();
    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(scroller);
    Array.from(scroller.children).forEach((child) => ro.observe(child));

    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro.disconnect();
    };
  }, []);

  const handleClick = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ top: scroller.clientHeight * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <>
      <span ref={anchorRef} aria-hidden className="hidden" />
      {createPortal(
        <AnimatePresence>
          {visible && centerX !== null && (
            <motion.button
              key="scroll-hint"
              type="button"
              onClick={handleClick}
              aria-label={t('dashboard_home.scroll_more')}
              initial={{ opacity: 0, y: 16, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 16, x: '-50%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ left: centerX }}
              className="group fixed bottom-5 z-30 flex items-center gap-1.5 h-9 pl-3.5 pr-3 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-12.5 font-medium text-[#00529C] dark:text-blue-300 shadow-[0_10px_28px_-10px_rgba(0,82,156,0.45)] hover:border-[#00529C]/40 dark:hover:border-blue-400/50 cursor-pointer transition-colors"
            >
              {t('dashboard_home.scroll_more')}
              <span className="flex dash-nudge">
                <ChevronsDown size={15} strokeWidth={2.4} />
              </span>
            </motion.button>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default ScrollDownHint;

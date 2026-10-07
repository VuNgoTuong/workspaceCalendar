import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { QUICK_ACTIONS } from '../../constants/quickActions';
import { useFlatMenusQuery, hasMenuPermission } from '../../hooks';
import { cn } from '../../utils/helpers';

const speedDialActionVariants = {
  closed: { opacity: 0, scale: 0.9, y: 6, transition: { duration: 0.1 } },
  open: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.12, ease: 'easeOut' as const } },
};

export const SpeedDialMenu: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const speedDialRef = useRef<HTMLDivElement>(null);
  const speedDialCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: menuList = [] } = useFlatMenusQuery();

  const allowedQuickActions = useMemo(() => {
    if (!menuList || menuList.length === 0) return QUICK_ACTIONS;
    return QUICK_ACTIONS.filter((action) => hasMenuPermission(menuList, action.path));
  }, [menuList]);

  const openSpeedDial = () => {
    if (speedDialCloseTimeoutRef.current) {
      clearTimeout(speedDialCloseTimeoutRef.current);
      speedDialCloseTimeoutRef.current = null;
    }
    setSpeedDialOpen(true);
  };

  const scheduleCloseSpeedDial = () => {
    speedDialCloseTimeoutRef.current = setTimeout(() => setSpeedDialOpen(false), 150);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!speedDialOpen) return;
      if (speedDialRef.current && !speedDialRef.current.contains(e.target as Node)) {
        setSpeedDialOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSpeedDialOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [speedDialOpen]);

  useEffect(() => {
    return () => {
      if (speedDialCloseTimeoutRef.current) clearTimeout(speedDialCloseTimeoutRef.current);
    };
  }, []);

  if (allowedQuickActions.length === 0) return null;

  return (
    <div
      ref={speedDialRef}
      onMouseEnter={openSpeedDial}
      onMouseLeave={scheduleCloseSpeedDial}
      onFocus={openSpeedDial}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) scheduleCloseSpeedDial();
      }}
      className="!fixed !bottom-6 !right-6 z-50 flex flex-col-reverse items-end gap-3"
    >
      <motion.button
        type="button"
        aria-label={t('header.create_new')}
        aria-expanded={speedDialOpen}
        onClick={() => setSpeedDialOpen((v) => !v)}
        initial={{ scale: 0.75 }}
        animate={{ scale: speedDialOpen ? 1 : 0.75 }}
        whileHover={{ scale: 1 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        className={cn(
          'relative w-13 h-13 rounded-2xl flex items-center justify-center text-white cursor-pointer select-none border-0 outline-none',
          'transition-[background,box-shadow] duration-300',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_24px_-8px_rgba(0,82,156,0.6),0_2px_6px_-1px_rgba(0,82,156,0.25)]',
          'focus-visible:ring-4 focus-visible:ring-blue-300/50 dark:focus-visible:ring-blue-500/40',
          speedDialOpen
            ? 'bg-gradient-to-br from-[#00529C] to-[#003D75] dark:from-blue-600 dark:to-blue-800'
            : 'bg-gradient-to-br from-[#1273CC] to-[#00529C] dark:from-blue-500 dark:to-blue-700'
        )}
      >
        <motion.span
          animate={{ rotate: speedDialOpen ? 135 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="flex items-center justify-center"
        >
          <Plus size={22} strokeWidth={2.25} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {speedDialOpen &&
          allowedQuickActions.map((action) => (
            <motion.button
              key={action.key}
              variants={speedDialActionVariants}
              initial="closed"
              animate="open"
              exit="closed"
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              type="button"
              onClick={() => {
                setSpeedDialOpen(false);
                navigate(action.path, action.state ? { state: action.state } : undefined);
              }}
              className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-2xl bg-[#F7F8FA] dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/60 shadow-[0_10px_24px_-6px_rgba(15,23,42,0.14)] dark:shadow-[0_10px_24px_-6px_rgba(0,0,0,0.45)] hover:shadow-[0_14px_28px_-6px_rgba(15,23,42,0.18)] transition-shadow duration-200 cursor-pointer select-none"
            >
              <span className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-[#111827] dark:text-slate-200 shrink-0 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
                <action.icon size={15} />
              </span>
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {t(action.labelKey)}
              </span>
            </motion.button>
          ))}
      </AnimatePresence>
    </div>
  );
};

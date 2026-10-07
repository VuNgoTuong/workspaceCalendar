import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/helpers';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: any; 
  onChange?: (value: any) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  className?: string;
  pill?: boolean;
  size?: 'sm' | 'md';
}

const SIZES = {
  sm: { trigger: 'min-h-[32px] px-2.5 py-1', text: 'text-xs', chevron: 13 },
  md: { trigger: 'min-h-[42px] px-3.5 py-2', text: 'text-sm', chevron: 16 },
};

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  label,
  error,
  disabled = false,
  searchable = true,
  multiple = false,
  className,
  pill = false,
  size = 'md',
}) => {
  const { t } = useTranslation();
  const effectivePlaceholder = placeholder ?? t('common.select_placeholder');
  const s = SIZES[size];
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    let rafId: number | null = null;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const next = { top: rect.bottom + 8, left: rect.left, width: rect.width };
      setMenuRect((prev) =>
        prev && prev.top === next.top && prev.left === next.left && prev.width === next.width
          ? prev
          : next
      );
    };
    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updatePosition();
      });
    };

    updatePosition();
    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchQuery('');
    }
  };

  const selectedValues = useMemo(() => {
    if (multiple) {
      return Array.isArray(value) ? value : value ? [value] : [];
    }
    return value !== undefined && value !== null ? [value] : [];
  }, [value, multiple]);

  const selectedOptions = useMemo(() => {
    return options.filter((opt) => selectedValues.includes(opt.value));
  }, [options, selectedValues]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const handleSelect = (option: SelectOption, e: React.MouseEvent) => {
    e.stopPropagation();
    if (option.disabled) return;

    if (multiple) {
      const isAlreadySelected = selectedValues.includes(option.value);
      const nextValues = isAlreadySelected
        ? selectedValues.filter((val) => val !== option.value)
        : [...selectedValues, option.value];
      onChange?.(nextValues);
    } else {
      onChange?.(option.value);
      setIsOpen(false);
    }
  };

  const handleRemoveOption = (val: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const nextValues = selectedValues.filter((v) => v !== val);
    onChange?.(nextValues);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full text-left" ref={containerRef}>
      {label && (
        <label className="text-13 font-semibold text-slate-700 dark:text-slate-300 select-none">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Dropdown Trigger */}
        <div
          ref={triggerRef}
          onClick={handleToggle}
          className={cn(
            'flex items-center justify-between w-full bg-white dark:bg-slate-900 border cursor-pointer transition-all duration-200 focus-within:ring-4',
            s.trigger,
            pill ? 'rounded-full' : 'rounded-xl',
            isOpen
              ? 'border-[#00529C] ring-[#00529C]/10 dark:border-[#0066C7] dark:ring-[#0066C7]/15'
              : 'border-slate-200 dark:border-slate-800',
            error ? 'border-red-500 ring-red-500/10 focus-within:border-red-500' : '',
            disabled ? 'bg-slate-50 dark:bg-slate-900/50 opacity-60 pointer-events-none cursor-not-allowed' : '',
            className
          )}
        >
          <div className="flex flex-wrap gap-1.5 items-center mr-2 flex-1">
            {selectedOptions.length === 0 ? (
              <span className={cn('text-slate-400 dark:text-slate-500 select-none', s.text)}>
                {effectivePlaceholder}
              </span>
            ) : multiple ? (
              selectedOptions.map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#00529C] dark:text-[#60a5fa] border border-blue-100 dark:border-blue-900/40 rounded-lg animate-fade-in"
                >
                  <span className="max-w-[120px] truncate">{opt.label}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveOption(opt.value, e)}
                    className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded text-[#00529C] dark:text-[#60a5fa] border-0 cursor-pointer"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </span>
              ))
            ) : (
              <span className={cn('font-medium text-slate-800 dark:text-slate-100 truncate', s.text)}>
                {selectedOptions[0].label}
              </span>
            )}
          </div>

          <div className="flex items-center text-slate-400 dark:text-slate-500 shrink-0">
            <ChevronDown
              size={s.chevron}
              className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </div>
        </div>

        {/* Dropdown Menu — portaled to <body> so it can never be clipped by a
            scrollable ancestor (e.g. a table with overflow-x: auto) */}
        {isOpen && menuRect && createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuRect.top, left: menuRect.left, width: menuRect.width }}
            className="z-[9999] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.3)] overflow-hidden animate-slide-down max-h-[300px] flex flex-col"
          >
            {/* Search input in Dropdown */}
            {searchable && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={t('common.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400"
                />
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto flex-1 py-1.5 slim-scroll">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-6 text-sm text-center text-slate-400 dark:text-slate-500">
                  {t('common.no_results')}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      onClick={(e) => handleSelect(option, e)}
                      className={cn(
                        'flex items-center justify-between px-3.5 py-2.5 mx-1.5 rounded-lg transition-colors cursor-pointer select-none',
                        s.text,
                        isSelected
                          ? 'bg-slate-50 dark:bg-slate-800/70 font-semibold text-[#00529C] dark:text-[#60a5fa]'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100',
                        option.disabled && 'opacity-40 pointer-events-none cursor-not-allowed'
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && (
                        <Check size={14} className="text-[#00529C] dark:text-[#60a5fa] shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
      </div>

      {error && (
        <span className="text-xs font-medium text-red-500 animate-fade-in pl-1">
          {error}
        </span>
      )}
    </div>
  );
};

export default Select;

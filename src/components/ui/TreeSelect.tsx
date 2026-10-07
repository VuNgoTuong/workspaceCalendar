import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from './Tooltip';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/helpers';
import { ChevronDown, ChevronRight, Check, X, Lock } from 'lucide-react';

export interface TreeSelectProps<T> {
  value?: string | number;
  onChange?: (value: string | number, record: T) => void;
  loadChildren: (parentId: string | number | null) => Promise<T[]>;
  getLabel: (record: T) => string;
  getSecondary?: (record: T) => string | undefined | null;
  getSelectedLabel?: (record: T) => string;
  getValue: (record: T) => string | number;
  getIsLeaf?: (record: T) => boolean | undefined;
  resolvePath?: (value: string | number) => Promise<(string | number)[]>;
  displayLabel?: string;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  pill?: boolean;
  className?: string;
  allowClear?: boolean;
  onClear?: () => void;
  maxHeight?: number;
  /** Popup can be wider than the trigger (long nested names); it stays within the viewport. */
  popupMinWidth?: number;
}

interface NodeState<T> {
  children?: T[];
  loading: boolean;
  isLeaf?: boolean;
}

export function TreeSelect<T>({
  value,
  onChange,
  loadChildren,
  getLabel,
  getSecondary,
  getSelectedLabel,
  getValue,
  getIsLeaf,
  resolvePath,
  displayLabel,
  placeholder,
  label,
  error,
  disabled = false,
  readOnly = false,
  pill = false,
  className,
  allowClear = false,
  onClear,
  maxHeight = 320,
  popupMinWidth,
}: TreeSelectProps<T>) {
  const { t } = useTranslation();
  const effectivePlaceholder = placeholder ?? t('common.select_placeholder');
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const MENU_MAX_HEIGHT = maxHeight;
  const [rootNodes, setRootNodes] = useState<T[]>([]);
  const [rootLoading, setRootLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Record<string | number, boolean>>({});
  const [nodeStates, setNodeStates] = useState<Record<string | number, NodeState<T>>>({});
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(displayLabel);
  const [selectedSecondary, setSelectedSecondary] = useState<string | undefined | null>(undefined);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rootFetchedRef = useRef(false);
  const resolvePathRequestRef = useRef(0);

  const normalizeNodes = useCallback((nodes: T[] | null | undefined): T[] =>
    Array.isArray(nodes) ? nodes : []
  , []);

  useEffect(() => {
    setSelectedLabel(displayLabel);
  }, [displayLabel]);

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
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldFlip = spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow;
      const width = Math.min(Math.max(rect.width, popupMinWidth ?? 0), window.innerWidth - 32);
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
      const next = shouldFlip
        ? { bottom: window.innerHeight - rect.top + 8, left, width }
        : { top: rect.bottom + 8, left, width };
      setMenuRect((prev) =>
        prev &&
        prev.top === next.top &&
        prev.bottom === next.bottom &&
        prev.left === next.left &&
        prev.width === next.width
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
  }, [isOpen, popupMinWidth]);

  useEffect(() => {
    if (!isOpen || rootFetchedRef.current || rootLoading) return;
    if (resolvePath && value !== undefined) return;
    setRootLoading(true);
    loadChildren(null)
      .then((nodes) => {
        setRootNodes(normalizeNodes(nodes));
        rootFetchedRef.current = true;
      })
      .catch(() => {
        setRootNodes([]);
        rootFetchedRef.current = true;
      })
      .finally(() => setRootLoading(false));
  }, [isOpen, rootLoading, loadChildren, resolvePath, value, normalizeNodes]);

  useEffect(() => {
    if (!isOpen || value === undefined || !resolvePath) return;
    let cancelled = false;
    const requestId = ++resolvePathRequestRef.current;

    (async () => {
      setRootLoading(true);
      try {
        const [roots, path] = await Promise.all([
          rootFetchedRef.current ? Promise.resolve(rootNodes) : loadChildren(null).then(normalizeNodes),
          resolvePath(value),
        ]);
        if (cancelled || requestId !== resolvePathRequestRef.current) return;
        if (!rootFetchedRef.current) {
          setRootNodes(normalizeNodes(roots));
          rootFetchedRef.current = true;
        }

        const expanded: Record<string | number, boolean> = {};
        path.forEach((key) => { expanded[key] = true; });

        const childrenByLevel = await Promise.all(
          path.map((key) => loadChildren(key).then(normalizeNodes).catch(() => [] as T[]))
        );
        if (cancelled || requestId !== resolvePathRequestRef.current) return;

        const states: Record<string | number, NodeState<T>> = {};
        path.forEach((key, i) => {
          const children = childrenByLevel[i];
          states[key] = { children, loading: false, isLeaf: children.length === 0 };
        });
        setExpandedKeys((prev) => ({ ...prev, ...expanded }));
        setNodeStates((prev) => ({ ...prev, ...states }));

        requestAnimationFrame(() => {
          const el = menuRef.current?.querySelector(`[data-node-key="${CSS.escape(String(value))}"]`);
          el?.scrollIntoView({ block: 'center' });
        });
      } finally {
        if (!cancelled && requestId === resolvePathRequestRef.current) setRootLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, value, resolvePath]);

  const handleToggle = () => {
    if (!disabled) setIsOpen((prev) => !prev);
  };

  const handleSelect = (record: T, fullPath?: string) => {
    if (readOnly) return;
    onChange?.(getValue(record), record);
    setSelectedLabel(fullPath || (getSelectedLabel ? getSelectedLabel(record) : getLabel(record)));
    setSelectedSecondary(getSecondary?.(record));
    setIsOpen(false);
  };

  const handleExpand = useCallback(
    async (key: string | number) => {
      const isExpanded = !!expandedKeys[key];
      if (isExpanded) {
        setExpandedKeys((prev) => ({ ...prev, [key]: false }));
        return;
      }
      setExpandedKeys((prev) => ({ ...prev, [key]: true }));

      if (nodeStates[key]?.children) return;

      setNodeStates((prev) => ({ ...prev, [key]: { ...prev[key], loading: true } }));
      try {
        const children = normalizeNodes(await loadChildren(key));
        setNodeStates((prev) => ({
          ...prev,
          [key]: { children, loading: false, isLeaf: children.length === 0 },
        }));
      } catch {
        setNodeStates((prev) => ({ ...prev, [key]: { ...prev[key], loading: false, isLeaf: true } }));
      }
    },
    [expandedKeys, nodeStates, loadChildren, normalizeNodes]
  );

  const renderNodes = (nodes: T[], depth: number, ancestorLabels: string[] = []): React.ReactNode => {
    return nodes.map((record) => {
      const key = getValue(record);
      const isExpanded = !!expandedKeys[key];
      const state = nodeStates[key];
      const hint = getIsLeaf?.(record);
      const isLeaf = state?.isLeaf ?? hint;
      const isSelected = value !== undefined && value === key;
      const nodeLabels = [...ancestorLabels, getLabel(record)];
      const fullPath = nodeLabels.join('/');

      return (
        <div key={key}>
          <div
            data-node-key={key}
            onClick={() => handleSelect(record, fullPath)}
            className={cn(
              'flex items-center gap-1 px-1.5 py-2 mx-1.5 rounded-lg text-12.5 select-none transition-colors',
              readOnly ? 'cursor-default' : 'cursor-pointer',
              isSelected
                ? 'bg-slate-50 dark:bg-slate-800/70 font-semibold text-[#00529C] dark:text-[#60a5fa]'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
            style={{ paddingLeft: depth * 16 + 6 }}
          >
            {isLeaf ? (
              <span className="w-5 shrink-0" />
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpand(key);
                }}
                className="p-0.5 shrink-0 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded text-slate-400 border-0 cursor-pointer"
              >
                {state?.loading ? (
                  <div className="h-3 w-3 border-2 border-slate-300 border-t-[#00529C] rounded-full animate-spin" />
                ) : (
                  <ChevronRight size={13} className={cn('transition-transform duration-200', isExpanded && 'rotate-90')} />
                )}
              </button>
            )}
            <Tooltip
              title={fullPath}
              enterDelay={400}
              slotProps={{
                tooltip: { className: 'premium-tooltip-mui' },
                popper: { style: { zIndex: 10050 } },
              }}
            >
              <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                <span className="truncate">{getLabel(record)}</span>
                {getSecondary?.(record) && (
                  <span className="shrink-0 text-11 font-normal text-slate-400 dark:text-slate-500">
                    {getSecondary(record)}
                  </span>
                )}
              </span>
            </Tooltip>
            {isSelected && <Check size={14} className="text-[#00529C] dark:text-[#60a5fa] shrink-0" />}
          </div>

          {isExpanded && state?.children && renderNodes(state.children, depth + 1, nodeLabels)}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col gap-1.5 w-full text-left" ref={containerRef}>
      {label && (
        <label className="text-13 font-semibold text-slate-700 dark:text-slate-300 select-none">
          {label}
        </label>
      )}

      <div className="relative">
        <div
          ref={triggerRef}
          onClick={handleToggle}
          className={cn(
            'tree-select-trigger flex items-center justify-between w-full min-h-[40px] bg-white dark:bg-slate-900 border px-3.5 py-2 cursor-pointer transition-all duration-200 focus-within:ring-4',
            pill ? 'rounded-full' : 'rounded-xl',
            isOpen
              ? 'border-[#00529C] ring-[#00529C]/10 dark:border-[#0066C7] dark:ring-[#0066C7]/15'
              : 'border-slate-200 dark:border-slate-800',
            error ? 'border-red-500 ring-red-500/10 focus-within:border-red-500' : '',
            disabled ? 'bg-slate-50 dark:bg-slate-900/50 opacity-60 pointer-events-none cursor-not-allowed' : '',
            className
          )}
        >
          {selectedLabel ? (
            <Tooltip
              title={[selectedLabel, selectedSecondary].filter(Boolean).join(' ')}
              enterDelay={400}
              slotProps={{
                tooltip: { className: 'premium-tooltip-mui' },
                popper: { style: { zIndex: 10050 } },
              }}
            >
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate text-13 font-medium text-slate-800 dark:text-slate-100">{selectedLabel}</span>
                {selectedSecondary && (
                  <span className="shrink-0 text-xs font-normal text-slate-400 dark:text-slate-500">{selectedSecondary}</span>
                )}
              </span>
            </Tooltip>
          ) : (
            <span className="text-slate-500 dark:text-slate-400 text-13 font-normal select-none">{effectivePlaceholder}</span>
          )}
          {readOnly ? (
            <Lock size={14} className="shrink-0 text-slate-400 dark:text-slate-500" />
          ) : allowClear && selectedLabel ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLabel(undefined);
                onClear?.();
              }}
              className="flex shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X size={14} />
            </button>
          ) : (
            <ChevronDown size={16} className={cn('shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200', isOpen && 'rotate-180')} />
          )}
        </div>

        {isOpen && menuRect && createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuRect.top,
              bottom: menuRect.bottom,
              left: menuRect.left,
              width: menuRect.width,
              maxHeight: MENU_MAX_HEIGHT,
            }}
            className="z-[9999] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.3)] overflow-hidden animate-slide-down flex flex-col"
          >
            <div className="overflow-y-auto flex-1 py-1.5 slim-scroll">
              {rootLoading ? (
                <div className="px-4 py-6 text-sm text-center text-slate-400 dark:text-slate-500">{t('common.loading')}</div>
              ) : rootNodes.length === 0 ? (
                <div className="px-4 py-6 text-sm text-center text-slate-400 dark:text-slate-500">{t('common.no_data')}</div>
              ) : (
                renderNodes(rootNodes, 0)
              )}
            </div>
          </div>,
          document.body
        )}
      </div>

      {error && <span className="text-xs font-medium text-red-500 animate-fade-in pl-1">{error}</span>}
    </div>
  );
}

export default TreeSelect;

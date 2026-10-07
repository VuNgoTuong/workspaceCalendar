import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/helpers';
import { ChevronDown, ChevronLeft, ChevronRight, Search, Check, X, Loader2 } from 'lucide-react';

export interface PagedPickerResult<T> {
  items: T[];
  total: number;
}

export interface PagedPickerSelectProps<T> {
  value?: string;
  onChange?: (value: string, record?: T) => void;
  onSelectRecord?: (record?: T) => void;
  allowClear?: boolean;
  multiple?: boolean;
  values?: string[];
  onChangeValues?: (values: string[], records: T[]) => void;
  initialRecords?: T[];
  fetchPage: (params: { search: string; page: number; pageSize: number }) => Promise<PagedPickerResult<T>>;
  getValue: (record: T) => string;
  getLabel: (record: T) => string;
  renderOption: (record: T) => React.ReactNode;
  isOptionDisabled?: (record: T) => boolean;
  isChipRemovable?: (record: T) => boolean;
  renderSelected?: (record: T) => React.ReactNode;
  initialRecord?: T;
  placeholder?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  disabled?: boolean;
  className?: string;
  placement?: 'auto' | 'top' | 'bottom';
  optionBorderless?: boolean;
  menuMinWidth?: number;
}

export function PagedPickerSelect<T>({
  value,
  onChange,
  onSelectRecord,
  allowClear = true,
  multiple = false,
  onChangeValues,
  initialRecords,
  fetchPage,
  getValue,
  getLabel,
  renderOption,
  isOptionDisabled,
  isChipRemovable,
  renderSelected,
  initialRecord,
  placeholder,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  disabled = false,
  className,
  placement = 'auto',
  optionBorderless = false,
  menuMinWidth = 320,
}: PagedPickerSelectProps<T>) {
  const { t, i18n } = useTranslation();
  const effectivePlaceholder = placeholder ?? t('common.select_placeholder');
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{
    triggerTop: number;
    triggerBottom: number;
    left: number;
    width: number;
    openUp: boolean;
  } | null>(null);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageJumpInput, setPageJumpInput] = useState('1');
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(
    initialRecord ? getLabel(initialRecord) : undefined
  );
  const [selectedRecord, setSelectedRecord] = useState<T | undefined>(initialRecord);
  const [selectedRecords, setSelectedRecords] = useState<T[]>(initialRecords ?? []);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [pageSizeMenuRect, setPageSizeMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef('');
  const requestIdRef = useRef(0);
  const loadedKeyRef = useRef<string | null>(null);
  const pageSizeTriggerRef = useRef<HTMLButtonElement>(null);
  const pageSizeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) {
      setSelectedLabel(undefined);
      setSelectedRecord(undefined);
    } else if (initialRecord) {
      setSelectedLabel(getLabel(initialRecord));
      setSelectedRecord(initialRecord);
    }
  }, [value, initialRecord]);

  useEffect(() => {
    if (initialRecords) setSelectedRecords(initialRecords);
  }, [initialRecords]);

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

  useEffect(() => {
    if (!isOpen) setPageSizeMenuOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!pageSizeMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        pageSizeTriggerRef.current && !pageSizeTriggerRef.current.contains(target) &&
        pageSizeMenuRef.current && !pageSizeMenuRef.current.contains(target)
      ) {
        setPageSizeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pageSizeMenuOpen]);

  const togglePageSizeMenu = () => {
    if (pageSizeMenuOpen) {
      setPageSizeMenuOpen(false);
      return;
    }
    const rect = pageSizeTriggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = pageSizeOptions.length * 32 + 10;
    const openUp = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
    setPageSizeMenuRect({
      top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
      left: Math.max(rect.right - 96, 8),
      width: Math.max(rect.width, 96),
    });
    setPageSizeMenuOpen(true);
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    let rafId: number | null = null;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = menuRef.current?.offsetHeight || 480;

      let openUp = false;
      if (placement === 'top') {
        openUp = true;
      } else if (placement === 'bottom') {
        openUp = false;
      } else {
        openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
      }

      const menuWidth = Math.max(rect.width, menuMinWidth);
      setMenuRect({
        triggerTop: rect.top,
        triggerBottom: rect.bottom,
        width: menuWidth,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
        openUp,
      });
    };
    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updatePosition();
      });
    };
    updatePosition();
    window.addEventListener('scroll', scheduleUpdate, { capture: true, passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [isOpen, placement, items.length, loading, menuMinWidth]);

  const load = useCallback(async (searchText: string, pageNum: number, size: number) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res = await fetchPage({ search: searchText, page: pageNum, pageSize: size});
      if (requestId !== requestIdRef.current) return;
      setItems(res.items);
      setTotal(res.total);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [fetchPage]);

  const loadAndRemember = useCallback((searchText: string, pageNum: number, size: number) => {
    loadedKeyRef.current = `${searchText}|${pageNum}|${size}`;
    load(searchText, pageNum, size);
  }, [load]);

  useEffect(() => {
    if (!isOpen) return;
    const key = `${searchRef.current}|${page}|${pageSize}`;
    if (loadedKeyRef.current === key) return;
    loadAndRemember(searchRef.current, page, pageSize);
  }, [isOpen, page, pageSize, loadAndRemember]);

  useEffect(() => {
    if (isOpen) searchInputRef.current?.focus();
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) setIsOpen((prev) => !prev);
  };

  const handleOpen = () => {
    if (!disabled) setIsOpen(true);
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    searchRef.current = text;
  };

  const handleSearchSubmit = () => {
    setPage(1);
    loadAndRemember(searchRef.current, 1, pageSize);
  };

  const isRecordSelected = (record: T) => {
    const key = getValue(record);
    if (multiple) return selectedRecords.some((r) => getValue(r) === key);
    return value !== undefined && value === key;
  };

  const handleSelect = (record: T) => {
    if (multiple) {
      const key = getValue(record);
      setSelectedRecords((prev) => {
        const isAlreadySelected = prev.some((r) => getValue(r) === key);
        if (isAlreadySelected && isChipRemovable && !isChipRemovable(record)) {
          return prev;
        }
        const next = isAlreadySelected
          ? prev.filter((r) => getValue(r) !== key)
          : [...prev, record];
        onChangeValues?.(next.map(getValue), next);
        return next;
      });
      return;
    }

    const key = getValue(record);
    const isSelected = (value !== undefined && value === key) || (selectedRecord !== undefined && getValue(selectedRecord) === key);

    if (isSelected && allowClear) {
      onChange?.('', undefined);
      onSelectRecord?.(undefined);
      setSelectedLabel(undefined);
      setSelectedRecord(undefined);
      setIsOpen(false);
      return;
    }

    onChange?.(key, record);
    onSelectRecord?.(record);
    setSelectedLabel(getLabel(record));
    setSelectedRecord(record);
    setIsOpen(false);
  };

  const handleRemoveChip = (record: T, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isChipRemovable && !isChipRemovable(record)) return;
    const key = getValue(record);
    setSelectedRecords((prev) => {
      const next = prev.filter((r) => getValue(r) !== key);
      onChangeValues?.(next.map(getValue), next);
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPageJumpInput(String(page));
  }, [page]);

  const commitPageJump = () => {
    const parsed = Number(pageJumpInput);
    const next = Number.isFinite(parsed) ? Math.min(totalPages, Math.max(1, Math.round(parsed))) : page;
    setPage(next);
    setPageJumpInput(String(next));
  };

  return (
    <div className="w-full text-left" ref={containerRef}>
      <div className="relative">
        <div
          ref={triggerRef}
          onClick={handleOpen}
          className={cn(
            'paged-picker-trigger flex items-center justify-between w-full min-h-[40px] bg-white dark:bg-slate-900 border rounded-xl px-3 py-1 transition-all duration-200 focus-within:ring-4 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
            isOpen
              ? 'border-[#00529C] ring-[#00529C]/10 dark:border-[#0066C7] dark:ring-[#0066C7]/15 shadow-[0_2px_8px_rgba(0,82,156,0.08)]'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer',
            disabled ? 'bg-slate-50 dark:bg-slate-900/50 opacity-60 pointer-events-none cursor-not-allowed' : '',
            className
          )}
        >
          {isOpen ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Search size={15} className="shrink-0 text-slate-400" />
              <input
                ref={searchInputRef}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit();
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                placeholder={t('common.search_enter_placeholder')}
                className="w-full min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400 placeholder:text-13 placeholder:font-normal"
              />
            </div>
          ) : multiple ? (
            <div onClick={handleOpen} className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 cursor-pointer py-0.5">
              {selectedRecords.length === 0 ? (
                <span className="text-slate-400 dark:text-slate-500 text-13 font-normal select-none">{effectivePlaceholder}</span>
              ) : (
                selectedRecords.map((record) => {
                  const removable = !isChipRemovable || isChipRemovable(record);
                  return (
                    <span
                      key={getValue(record)}
                      className={cn(
                        'inline-flex max-w-full items-center gap-1 rounded-md py-0.5 pl-2 text-xs font-medium',
                        removable
                          ? 'bg-[#00529C]/[0.08] dark:bg-[#0066C7]/15 pr-1 text-[#00529C] dark:text-[#60a5fa]'
                          : 'bg-slate-100 dark:bg-slate-800 pr-2 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                      )}
                    >
                      <span className="max-w-[180px] truncate">{getLabel(record)}</span>
                      {removable && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveChip(record, e)}
                          className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#00529C]/60 hover:bg-[#00529C]/15 hover:text-[#00529C] dark:text-[#60a5fa]/70 dark:hover:bg-[#0066C7]/25"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </span>
                  );
                })
              )}
            </div>
          ) : (
            <div onClick={handleOpen} className="min-w-0 flex-1 cursor-pointer">
              {selectedRecord && renderSelected ? (
                renderSelected(selectedRecord)
              ) : selectedLabel ? (
                <span className="text-13 font-medium text-slate-800 dark:text-slate-100 truncate">{selectedLabel}</span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 text-13 font-normal select-none">{effectivePlaceholder}</span>
              )}
            </div>
          )}
          {allowClear && !multiple && (selectedRecord || selectedLabel || value) ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onChange?.('', undefined);
                onSelectRecord?.(undefined);
                setSelectedLabel(undefined);
                setSelectedRecord(undefined);
              }}
              className="group/clear shrink-0 cursor-pointer p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
              title={t('common.clear') || 'Bỏ chọn'}
            >
              <X size={14} className="text-slate-400 dark:text-slate-500 group-hover/clear:text-slate-600 dark:group-hover/clear:text-slate-300" />
            </div>
          ) : (
            <ChevronDown
              size={16}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              className={cn('shrink-0 cursor-pointer text-slate-400 dark:text-slate-500 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          )}
        </div>

        {isOpen && menuRect && createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              left: menuRect.left,
              width: menuRect.width,
              ...(menuRect.openUp
                ? {
                    bottom: window.innerHeight - menuRect.triggerTop + 6,
                    maxHeight: Math.min(520, menuRect.triggerTop - 12),
                  }
                : {
                    top: menuRect.triggerBottom + 6,
                    maxHeight: Math.min(520, window.innerHeight - menuRect.triggerBottom - 12),
                  }),
            }}
            className="z-[9999] flex flex-col bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[20px] shadow-[0_20px_50px_rgba(15,23,42,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden animate-slide-down"
          >
            <div className="relative max-h-[440px] slim-scroll overflow-y-auto p-1.5 pt-2.5">
              {loading && items.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  <Loader2 size={18} className="animate-spin text-[#00529C] dark:text-blue-400" />
                  {t('common.loading')}
                </div>
              )}

              {!loading && items.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">{t('common.no_data')}</div>
              )}

              {items.length > 0 && (
                <>
                  <div
                    aria-hidden={loading}
                    className={cn('transition-opacity duration-150', loading ? 'pointer-events-none opacity-40' : 'opacity-100')}
                  >
                    {items.map((record) => {
                      const key = getValue(record);
                      const isSelected = isRecordSelected(record);
                      const isDisabled = isOptionDisabled?.(record) ?? false;
                      return (
                        <div
                          key={key}
                          onClick={() => !isDisabled && handleSelect(record)}
                          aria-disabled={isDisabled}
                          className={cn(
                            'group my-0.5 flex items-center gap-2 rounded-xl px-2.5 py-0.5 transition-all duration-150',
                            optionBorderless ? '' : 'border',
                            isDisabled
                              ? cn('cursor-not-allowed opacity-45 grayscale-[0.3]', !optionBorderless && 'border-transparent')
                              : cn(
                                  'cursor-pointer',
                                  isSelected
                                    ? cn('bg-[#00529C]/[0.08] dark:bg-[#0066C7]/15', !optionBorderless && 'border-[#00529C]/25 dark:border-[#0066C7]/30')
                                    : cn(
                                        'bg-white shadow-xs dark:bg-slate-900/60 hover:bg-blue-50/50 hover:shadow-sm dark:hover:bg-blue-950/20',
                                        !optionBorderless && 'border-slate-100 dark:border-slate-800 hover:border-[#00529C]/25 dark:hover:border-blue-500/30'
                                      )
                                )
                          )}
                        >
                          <div className="min-w-0 flex-1">{renderOption(record)}</div>
                          {isSelected && !isDisabled && (
                            <Check size={16} className="shrink-0 text-[#00529C] dark:text-[#60a5fa]" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {loading && (
                    <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-10">
                      <Loader2 size={18} className="animate-spin text-[#00529C] dark:text-blue-400" />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-12 font-normal text-slate-800 dark:text-slate-100">
                  {total.toLocaleString(i18n.language)} {t('common.pagination_records')}
                </span>
                <button
                  ref={pageSizeTriggerRef}
                  type="button"
                  onClick={togglePageSizeMenu}
                  className={cn(
                    'flex items-center gap-1 cursor-pointer rounded-lg border bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none transition-colors',
                    pageSizeMenuOpen
                      ? 'border-[#00529C] ring-2 ring-[#00529C]/15 dark:border-blue-500 dark:ring-blue-500/20'
                      : 'border-slate-300 dark:border-slate-600 hover:border-[#00529C] dark:hover:border-blue-500'
                  )}
                >
                  {pageSize}{t('common.per_page_suffix')}
                  <ChevronDown size={12} className={cn('shrink-0 text-slate-400 transition-transform duration-200', pageSizeMenuOpen && 'rotate-180')} />
                </button>

                {pageSizeMenuOpen && pageSizeMenuRect && createPortal(
                  <div
                    ref={pageSizeMenuRef}
                    style={{ position: 'fixed', top: pageSizeMenuRect.top, left: pageSizeMenuRect.left, width: pageSizeMenuRect.width }}
                    className="z-[10000] flex flex-col gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0_12px_32px_rgba(15,23,42,0.18)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.6)] p-1"
                  >
                    {pageSizeOptions.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setPageSize(size);
                          setPage(1);
                          setPageSizeMenuOpen(false);
                        }}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                          size === pageSize
                            ? 'bg-[#00529C]/10 text-[#00529C] dark:bg-blue-500/15 dark:text-blue-400'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                      >
                        {size}{t('common.per_page_suffix')}
                        {size === pageSize && <Check size={13} className="shrink-0" />}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-11 font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 hover:text-[#00529C] disabled:pointer-events-none disabled:opacity-40"
                >
                  {t('common.pagination_first')}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 hover:text-[#00529C] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft size={14} className="stroke-[2.5]" />
                  </button>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={pageJumpInput}
                      onChange={(e) => setPageJumpInput(e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={commitPageJump}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitPageJump();
                        }
                      }}
                      className="h-7 w-12 shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center text-xs font-semibold text-slate-900 dark:text-white outline-none transition-colors focus:border-[#00529C] focus:ring-2 focus:ring-[#00529C]/20"
                    />
                    <span className="shrink-0 select-none text-slate-700 dark:text-slate-200 font-semibold">/ {totalPages.toLocaleString(i18n.language)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 hover:text-[#00529C] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronRight size={14} className="stroke-[2.5]" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-11 font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 hover:text-[#00529C] disabled:pointer-events-none disabled:opacity-40"
                >
                  {t('common.pagination_last')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

export default PagedPickerSelect;

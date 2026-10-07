import React, { useState, useCallback, useMemo, useImperativeHandle } from 'react';
import { Empty } from 'antd';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/helpers';
import { ChevronRight, ChevronLeft, ChevronDown } from 'lucide-react';

export interface TablePaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
  pageSizeOptions?: number[];
}

export interface TreeTableColumn<T> {
  key: string;
  title: React.ReactNode;
  dataIndex?: keyof T | string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: T, depth: number) => React.ReactNode;
  isTreeColumn?: boolean;
}

export interface LoadChildrenResult<T> {
  items: T[];
  hasMore: boolean;
}

export interface TreeTableProps<T> {
  columns: TreeTableColumn<T>[];
  dataSource: T[];
  rowKey: keyof T | ((record: T) => string | number);
  loading?: boolean;
  refreshing?: boolean;
  pagination?: TablePaginationConfig | false;
  loadChildren: (parentId: string | number, record: T, page: number) => Promise<LoadChildrenResult<T>>;
  getIsLeaf?: (record: T) => boolean | undefined;
  onChildrenLoaded?: (parentKey: string | number, children: T[]) => void;
  className?: string;
}

interface NodeState<T> {
  children?: T[];
  loading: boolean;
  loadingMore?: boolean;
  refreshing?: boolean;
  isLeaf?: boolean;
  page: number;
  hasMore: boolean;
}

export interface TreeTableHandle<T> {
  updateRecord: (key: string | number, patch: Partial<T>) => void;
  reloadExpandedNodes: () => Promise<void>;
}

function TreeTableInner<T>(
  {
    columns,
    dataSource,
    rowKey,
    loading = false,
    refreshing = false,
    pagination = false,
    loadChildren,
    getIsLeaf,
    onChildrenLoaded,
    className,
  }: TreeTableProps<T>,
  ref: React.Ref<TreeTableHandle<T>>
) {
  const { t } = useTranslation();
  const [expandedKeys, setExpandedKeys] = useState<Record<string | number, boolean>>({});
  const [nodeStates, setNodeStates] = useState<Record<string | number, NodeState<T>>>({});

  const getRecordKey = useCallback(
    (record: T): string | number => {
      if (typeof rowKey === 'function') return rowKey(record);
      return (record[rowKey] as any) ?? String(Math.random());
    },
    [rowKey]
  );

  const treeColumnKey = columns.find((c) => c.isTreeColumn)?.key ?? columns[0]?.key;

  const handleToggle = useCallback(
    async (key: string | number, record: T) => {
      const isExpanded = !!expandedKeys[key];
      if (isExpanded) {
        setExpandedKeys((prev) => ({ ...prev, [key]: false }));
        return;
      }

      setExpandedKeys((prev) => ({ ...prev, [key]: true }));

      const cached = nodeStates[key];
      if (cached?.children) return;

      setNodeStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], loading: true, page: 1, hasMore: false },
      }));
      try {
        const { items, hasMore } = await loadChildren(key, record, 1);
        setNodeStates((prev) => ({
          ...prev,
          [key]: { children: items, loading: false, page: 1, hasMore, isLeaf: items.length === 0 },
        }));
        onChildrenLoaded?.(key, items);
      } catch (err) {
        setNodeStates((prev) => ({ ...prev, [key]: { ...prev[key], loading: false } }));
      }
    },
    [expandedKeys, nodeStates, loadChildren, onChildrenLoaded]
  );

  const handleLoadMore = useCallback(
    async (key: string | number, record: T) => {
      const state = nodeStates[key];
      if (!state || state.loadingMore || !state.hasMore) return;

      const nextPage = (state.page ?? 1) + 1;
      setNodeStates((prev) => ({ ...prev, [key]: { ...prev[key], loadingMore: true } }));
      try {
        const { items, hasMore } = await loadChildren(key, record, nextPage);
        setNodeStates((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            children: [...(prev[key]?.children ?? []), ...items],
            page: nextPage,
            hasMore,
            loadingMore: false,
          },
        }));
        onChildrenLoaded?.(key, items);
      } catch (err) {
        setNodeStates((prev) => ({ ...prev, [key]: { ...prev[key], loadingMore: false } }));
      }
    },
    [nodeStates, loadChildren, onChildrenLoaded]
  );

  const collectRecordMap = useCallback(
    (nodes: T[], map: Map<string | number, T>, states: Record<string | number, NodeState<T>>) => {
      for (const node of nodes) {
        const nodeKey = getRecordKey(node);
        map.set(nodeKey, node);
        const children = states[nodeKey]?.children;
        if (children?.length) collectRecordMap(children, map, states);
      }
    },
    [getRecordKey]
  );

  const reloadExpandedNodes = useCallback(async () => {
    const keysToReload = (Object.keys(expandedKeys) as (string | number)[]).filter((key) => expandedKeys[key]);
    if (keysToReload.length === 0) return;

    const recordMap = new Map<string | number, T>();
    collectRecordMap(dataSource, recordMap, nodeStates);

    const pagesByKey = new Map<string | number, number>();
    for (const key of keysToReload) {
      pagesByKey.set(key, nodeStates[key]?.page ?? 1);
    }

    setNodeStates((prev) => {
      const next = { ...prev };
      for (const key of keysToReload) {
        const existing = prev[key];
        next[key] = {
          ...existing,
          children: existing?.children,
          loading: false,
          refreshing: true,
          page: existing?.page ?? 1,
          hasMore: existing?.hasMore ?? false,
        };
      }
      return next;
    });

    try {
      const results = await Promise.all(
        keysToReload.map(async (key) => {
          const record = recordMap.get(key);
          if (!record) return { key, error: true as const };

          const totalPages = pagesByKey.get(key) ?? 1;
          let allItems: T[] = [];
          let hasMore = false;

          try {
            for (let page = 1; page <= totalPages; page += 1) {
              const result = await loadChildren(key, record, page);
              allItems = page === 1 ? result.items : [...allItems, ...result.items];
              hasMore = page === totalPages ? result.hasMore : false;
            }
            return { key, error: false as const, allItems, hasMore, totalPages };
          } catch {
            return { key, error: true as const };
          }
        })
      );

      setNodeStates((prev) => {
        const next = { ...prev };
        for (const result of results) {
          if (result.error) {
            next[result.key] = { ...prev[result.key], refreshing: false };
            continue;
          }
          next[result.key] = {
            children: result.allItems,
            loading: false,
            refreshing: false,
            page: result.totalPages,
            hasMore: result.hasMore,
            isLeaf: result.allItems.length === 0,
          };
        }
        return next;
      });

      for (const result of results) {
        if (!result.error) onChildrenLoaded?.(result.key, result.allItems);
      }
    } finally{}
  }, [collectRecordMap, dataSource, expandedKeys, loadChildren, nodeStates, onChildrenLoaded]);

  useImperativeHandle(
    ref,
    () => ({
      updateRecord: (key, patch) => {
        setNodeStates((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const stateKey of Object.keys(prev)) {
            const state = prev[stateKey];
            if (!state?.children) continue;
            const idx = state.children.findIndex((r) => getRecordKey(r) === key);
            if (idx === -1) continue;
            const updatedChildren = [...state.children];
            updatedChildren[idx] = { ...updatedChildren[idx], ...patch };
            next[stateKey] = { ...state, children: updatedChildren };
            changed = true;
          }
          return changed ? next : prev;
        });
      },
      reloadExpandedNodes,
    }),
    [getRecordKey, reloadExpandedNodes]
  );

  const renderGuides = (depth: number) =>
    Array.from({ length: depth }).map((_, i) => <span key={i} className="w-6 shrink-0" />);

  const renderCell = (column: TreeTableColumn<T>, record: T, depth: number) => {
    const value = column.dataIndex ? (record as any)[column.dataIndex] : undefined;
    const content = column.render ? column.render(value, record, depth) : String(value ?? '');

    if (column.key !== treeColumnKey) return content;

    const key = getRecordKey(record);
    const isExpanded = !!expandedKeys[key];
    const state = nodeStates[key];
    const hint = getIsLeaf?.(record);
    const isLeaf = state?.isLeaf ?? hint;

    return (
      <div className="flex items-center">
        {renderGuides(depth)}

        {isLeaf ? (
          <span className="w-7 h-7 shrink-0 flex items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle(key, record);
            }}
            className={cn(
              'w-7 h-7 shrink-0 flex items-center justify-center rounded-full border-0 cursor-pointer transition-all duration-200',
              isExpanded
                ? 'bg-[#00529C]/10 text-[#00529C] dark:bg-blue-400/10 dark:text-blue-400'
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {state?.loading && !state?.children ? (
              <div className="h-3.5 w-3.5 border-2 border-slate-300 border-t-[#00529C] rounded-full animate-spin" />
            ) : (
              <ChevronRight
                size={14}
                className={cn(
                  'transition-transform duration-200',
                  isExpanded && 'rotate-90',
                  state?.refreshing && 'animate-pulse-slow'
                )}
              />
            )}
          </button>
        )}
        <div className="min-w-0 flex-1 pl-2">{content}</div>
      </div>
    );
  };

  const renderRows = (nodes: T[], depth: number, parentRefreshing = false): React.ReactNode[] => {
    return nodes.flatMap((record) => {
      const key = getRecordKey(record);
      const isExpanded = !!expandedKeys[key];
      const state = nodeStates[key];
      const subtreeRefreshing = parentRefreshing || !!state?.refreshing;
      const rowRefreshing = (refreshing && depth === 0) || (subtreeRefreshing && depth > 0);

      const row = (
        <tr
          key={key}
          className={cn(
            'group transition-all duration-300 hover:bg-gradient-to-r hover:from-[#00529C]/[0.04] hover:to-transparent dark:hover:from-blue-400/[0.05]',
            isExpanded && 'bg-slate-50/40 dark:bg-slate-800/20',
            rowRefreshing && 'opacity-70'
          )}
        >
          {columns.map((column) => (
            <td
              key={column.key}
              className={cn(
                'px-3 py-1.5 text-[11px] text-[#1e293b] dark:text-slate-300 font-normal',
                column.align === 'center' && 'text-center',
                column.align === 'right' && 'text-right'
              )}
            >
              {renderCell(column, record, depth)}
            </td>
          ))}
        </tr>
      );

      if (!isExpanded) return [row];

      const childRows = state?.children ? renderRows(state.children, depth + 1, subtreeRefreshing) : [];

      const loadMoreRow = state?.hasMore ? (
        <tr key={`${key}-load-more`} className="hover:bg-transparent">
          <td colSpan={columns.length} className="px-4.5 py-1.5">
            <div className="flex items-center">
              {renderGuides(depth + 1)}
              <button
                type="button"
                disabled={state.loadingMore}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadMore(key, record);
                }}
                className="flex items-center gap-1.5 h-7 px-3 rounded-full border border-dashed border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 hover:border-[#00529C]/40 hover:text-[#00529C] dark:hover:text-blue-400 disabled:opacity-60 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                {state.loadingMore ? (
                  <span className="h-3 w-3 border-2 border-slate-300 border-t-[#00529C] rounded-full animate-spin" />
                ) : (
                  <ChevronRight size={12} className="rotate-90" />
                )}
                {t('common.load_more')}
              </button>
            </div>
          </td>
        </tr>
      ) : null;

      return loadMoreRow ? [row, ...childRows, loadMoreRow] : [row, ...childRows];
    });
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;
  const skeletonRows = Array.from({ length: 5 });

  const pageRange = useMemo(() => {
    if (!pagination) return [];
    const current = pagination.current;
    const delta = 1;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | null = null;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l !== null) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l > 2) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  }, [pagination, totalPages]);

  return (
    <div className={cn('flex flex-col w-full gap-4', className)}>
      <div className="relative w-full overflow-hidden border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto w-full slim-scroll">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="relative border-b border-[#cbd5e1] dark:border-slate-800 bg-[#eff2f7] dark:bg-[#1e293b]">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    style={{ width: column.width }}
                    className={cn(
                      'px-3 py-[11px] text-12.5 font-semibold tracking-[0.02em] text-[#25282f] dark:text-[#f8fafc] select-none',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f8fafc] dark:divide-slate-800/80">
              {loading ? (
                skeletonRows.map((_, rIdx) => (
                  <tr key={rIdx} className="hover:bg-transparent">
                    {columns.map((column, cIdx) => (
                      <td key={column.key} className="px-4.5 py-4">
                        <div
                          className="h-4 rounded-full bg-gradient-to-r from-slate-100 via-slate-200/70 to-slate-100 dark:from-slate-800 dark:via-slate-700/60 dark:to-slate-800 bg-[length:200%_100%] animate-shimmer"
                          style={{ width: cIdx === 0 ? '60%' : '40%' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : dataSource.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 px-4 text-center">
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </td>
                </tr>
              ) : (
                renderRows(dataSource, 0)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && !loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 select-none">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('common.pagination_showing')} <span className="font-semibold text-slate-800 dark:text-slate-200">{(pagination.current - 1) * pagination.pageSize + 1}</span> – <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(pagination.current * pagination.pageSize, pagination.total)}</span> {t('common.pagination_of')} <span className="font-semibold text-slate-800 dark:text-slate-200">{pagination.total.toLocaleString('vi-VN')}</span> {t('common.pagination_records')}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
              disabled={pagination.current === 1}
              className="h-[34px] w-[34px] flex items-center justify-center rounded-[10px] border border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#00529C] hover:bg-blue-50 dark:hover:bg-slate-800 hover:-translate-y-px hover:shadow-[0_4px_10px_rgba(0,82,156,0.12)] text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:pointer-events-none disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 cursor-pointer"
            >
              <ChevronLeft size={15} />
            </button>

            {pageRange.map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`dots-${index}`}
                    className="h-[34px] min-w-[34px] px-2 flex items-center justify-center rounded-[10px] border border-transparent text-sm text-slate-400 dark:text-slate-500 font-medium"
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = pagination.current === page;
              return (
                <button
                  key={`page-${page}`}
                  onClick={() => pagination.onChange(page as number, pagination.pageSize)}
                  className={cn(
                    'h-[34px] min-w-[34px] px-2.5 flex items-center justify-center text-13 font-medium rounded-[10px] border transition-all duration-200 cursor-pointer',
                    isCurrent
                      ? 'bg-gradient-to-r from-[#00529C] to-[#0066C7] text-white font-bold border-transparent shadow-[0_4px_14px_rgba(0,82,156,0.35)] -translate-y-px'
                      : 'bg-white dark:bg-slate-900 border-[#e2e8f0] dark:border-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-slate-600 dark:text-slate-300 hover:border-[#00529C] hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-[#00529C] hover:-translate-y-px hover:shadow-[0_4px_10px_rgba(0,82,156,0.12)]'
                  )}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
              disabled={pagination.current === totalPages}
              className="h-[34px] w-[34px] flex items-center justify-center rounded-[10px] border border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#00529C] hover:bg-blue-50 dark:hover:bg-slate-800 hover:-translate-y-px hover:shadow-[0_4px_10px_rgba(0,82,156,0.12)] text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:pointer-events-none disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 cursor-pointer"
            >
              <ChevronRight size={15} />
            </button>

            <div className="relative ml-1">
              <select
                value={pagination.pageSize}
                onChange={(e) => pagination.onChange(1, Number(e.target.value))}
                className="h-[34px] appearance-none rounded-[10px] border border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-900 pl-3 pr-7 text-13 font-medium text-slate-600 dark:text-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none cursor-pointer transition-all duration-200 hover:border-[#00529C] focus:border-[#00529C] focus:ring-4 focus:ring-[#00529C]/10"
              >
                {(pagination.pageSizeOptions ?? [10, 20, 50, 100]).map((size) => (
                  <option key={size} value={size}>
                    {size}{t('common.per_page_suffix')}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const TreeTable = React.memo(React.forwardRef(TreeTableInner)) as <T>(
  props: TreeTableProps<T> & { ref?: React.Ref<TreeTableHandle<T>> }
) => React.ReactElement;

export default TreeTable;

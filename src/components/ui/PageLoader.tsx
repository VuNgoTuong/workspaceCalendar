import React, { useMemo } from 'react';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/helpers';
import { useSidebarStore } from '../../store/sidebarStore';

interface PageLoaderProps {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

const SHIMMER_MS = 1400; 

const useShimmerDelay = () => useMemo(() => `-${Math.round(performance.now() % SHIMMER_MS)}ms`, []);

const Bone: React.FC<{ className?: string }> = ({ className }) => {
  const animationDelay = useShimmerDelay();
  return <div className={cn('skeleton-block rounded-lg', className)} style={{ animationDelay }} />;
};

const SURFACE = 'rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900';

const AppShellSkeleton: React.FC = () => {
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] dark:bg-slate-900">
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800',
          collapsed ? 'w-16' : 'w-[13.5rem]'
        )}
      >
        <div className={cn('h-14 flex items-center border-b border-slate-100 dark:border-slate-800', collapsed ? 'justify-center' : 'px-4')}>
          <Bone className={collapsed ? 'h-6 w-8' : 'h-6 w-24'} />
        </div>
        <div className="flex flex-col gap-2 p-3 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn('flex items-center gap-2.5 h-9', collapsed ? 'justify-center' : 'px-2')}>
              <Bone className="w-4 h-4 rounded-md shrink-0" />
              {!collapsed && <Bone className={cn('h-3', i % 2 ? 'w-20' : 'w-28')} />}
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-14 shrink-0 flex items-center gap-4 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <Bone className="h-3.5 w-40 hidden sm:block" />
          <Bone className="h-8 flex-1 max-w-xl mx-auto rounded-full" />
          <Bone className="w-8 h-8 rounded-full shrink-0" />
          <Bone className="h-3.5 w-24 hidden md:block" />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4 flex flex-col gap-4">
          <div className={cn(SURFACE, 'p-5 flex flex-col gap-2.5')}>
            <Bone className="h-3 w-28" />
            <Bone className="h-7 w-72 max-w-full" />
            <Bone className="h-3 w-96 max-w-full" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn(SURFACE, 'p-4 flex items-center gap-3')}>
                <Bone className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <Bone className="h-3 w-3/4" />
                  <Bone className="h-5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
            <div className={cn(SURFACE, 'p-5 flex flex-col gap-3')}>
              <Bone className="h-4 w-48" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-9 w-12 shrink-0" />
                  <Bone className="h-14 flex-1 rounded-xl" />
                </div>
              ))}
            </div>
            <div className={cn(SURFACE, 'p-5 flex flex-col gap-3')}>
              <Bone className="h-4 w-32" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Bone key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * `fullScreen` (first load / F5): skeleton of the whole app shell.
 * Inline (page chunks, sections inside the layout): the standard antd spinner.
 */
export const PageLoader: React.FC<PageLoaderProps> = ({ label, fullScreen = false, className }) => {
  const { t } = useTranslation();
  const text = (label || t('common.loading')).replace(/\.+$/, '');

  if (fullScreen) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className={cn('w-full', className)}>
        <span className="sr-only">{text}</span>
        <AppShellSkeleton />
      </div>
    );
  }

  return (
    // Fill the content area so the spinner sits in its middle, not just below the breadcrumb.
    <div className={cn('flex items-center justify-center h-full min-h-[240px]', className)}>
      <Spin size="large" aria-label={text} />
    </div>
  );
};

export default PageLoader;

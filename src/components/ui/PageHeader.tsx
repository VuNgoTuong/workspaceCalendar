import React from 'react';
import { Breadcrumbs } from '@mui/material';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  title: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  extra?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  extra,
  className = '',
}) => {
  return (
    <div className={`mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-300 ${className}`}>
      <div className="space-y-1.5 flex-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs className="text-xs mb-1.5 select-none" separator="/">
            {breadcrumbs.map((item, idx) => (
              item.path ? (
                <Link key={idx} to={item.path} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium">
                  {item.title}
                </Link>
              ) : (
                <span key={idx} className="text-slate-500 dark:text-slate-400">{item.title}</span>
              )
            ))}
          </Breadcrumbs>
        )}

        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight select-none">
          {title}
        </h1>

        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 font-normal leading-normal max-w-2xl select-none">
            {description}
          </p>
        )}
      </div>

      {extra && (
        <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
          {extra}
        </div>
      )}
    </div>
  );
};

export default PageHeader;

import errorMessages from '../constants/errorMessage.json';
import i18n from '../i18n';
import { API_CONFIG } from '../constants/api';

interface IErrorMessageEntry {
  Key: string;
  MessageEN: string;
  MessageVN: string;
}

const errorMessageMap = new Map<string, IErrorMessageEntry>(
  (errorMessages as IErrorMessageEntry[]).map((entry) => [entry.Key, entry])
);

export function getApiErrorMessage(error: any, fallback?: string): string | undefined {
  const errorKey = error?.response?.data?.errorCode;
  const entry = typeof errorKey === 'string' ? errorMessageMap.get(errorKey) : undefined;
  if (entry) {
    return i18n.language === 'en' ? entry.MessageEN : entry.MessageVN;
  }
  return error?.response?.data?.message || error?.message || fallback;
}

export function cn(...classes: (string | boolean | undefined | null | { [key: string]: boolean })[]): string {
  const result: string[] = [];

  for (const item of classes) {
    if (!item) continue;

    if (typeof item === 'string') {
      result.push(item);
    } else if (typeof item === 'object') {
      for (const [key, value] of Object.entries(item)) {
        if (value) {
          result.push(key);
        }
      }
    }
  }

  return result.join(' ');
}

export function parseBackendDate(date: string | Date | number | undefined | null): Date {
  if (date === undefined || date === null || date === '') return new Date(NaN);
  if (date instanceof Date) return date;
  if (typeof date === 'number') return new Date(date);

  const dateStr = date.trim();
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(dateStr);
  return new Date(hasTimezone ? dateStr : `${dateStr}Z`);
}

export function formatDate(
  dateString: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions,
  locale = 'vi-VN'
): string {
  if (!dateString) return '-';
  try {
    const date = parseBackendDate(dateString);
    if (isNaN(date.getTime())) return '-';

    const defaultOptions: Intl.DateTimeFormatOptions = options || {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

export function formatRelativeTime(dateString: string | Date | undefined | null): string {
  if (!dateString) return '';
  const date = parseBackendDate(dateString);
  if (isNaN(date.getTime())) return '';

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return i18n.t('common.time_just_now');

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return i18n.t('common.time_minutes_ago', { count: diffMinutes });

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return i18n.t('common.time_hours_ago', { count: diffHours });

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return i18n.t('common.time_days_ago', { count: diffDays });

  return formatDate(date, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function resolveAttachmentUrl(filePath: string | null | undefined): string {
  if (!filePath) return '';
  if (/^https?:\/\//i.test(filePath)) return filePath;

  let normalized = filePath.replace(/\\/g, '/');
  const uploadsIndex = normalized.toLowerCase().indexOf('/uploads/');
  if (uploadsIndex !== -1) {
    normalized = normalized.slice(uploadsIndex);
  }

  const base = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
  return `${base}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

export function formatCurrency(value: number, currency: 'VND' | 'USD' = 'VND', locale = 'vi-VN'): string {
  if (value === undefined || value === null || isNaN(value)) return '-';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(value);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return String(value);
  }
}

export function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

export const storage = {
  prefix: 'schedule_mgmt_',
  
  get<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? safeJsonParse<T>(item, fallback) : fallback;
    } catch (e) {
      console.warn('Storage read error:', e);
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (e) {
      console.warn('Storage remove error:', e);
    }
  },

  clear(): void {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(this.prefix))
        .forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
  },
};

export function truncateText(text: string | null | undefined, maxLength: number, suffix = '...'): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + suffix;
}

export function buildQueryString(params: Record<string, any>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function translateMenuLabel(name: string, url: string | null | undefined): string {
  if (!url) return name;

  const trimmed = url.trim();
  if (!trimmed || trimmed === '#') return name;

  let cleanUrl = trimmed.toLowerCase().replace(/\/+$/, '') || '/';
  if (!cleanUrl.startsWith('/') && cleanUrl !== '/' && !cleanUrl.startsWith('http')) {
    cleanUrl = `/${cleanUrl}`;
  }

  const keyMap: Record<string, string> = {
    '/': 'console',
    '/dashboard': 'console',
    '/he-thong': 'system',
    '/he-thong/nhan-vien': 'system_employees',
    '/he-thong/vai-tro': 'system_roles',
    '/he-thong/phan-quyen': 'system_permissions',
    '/he-thong/cau-hinh-menu': 'system_menu_config',
    '/he-thong/cau-hinh-mail': 'system_mail_config',
    '/danh-muc': 'categories',
    '/danh-muc/don-vi-phong-ban': 'categories_department',
    '/danh-muc/loai-lich-hop': 'categories_meeting_type',
    '/lich-lam-viec': 'nav_work_schedule',
    '/lich-lam-viec/tong-hop': 'work_schedule.overview',
    '/lich-lam-viec/ca-nhan': 'work_schedule.personal_calendar',
    '/lich-lam-viec/dang-ky-lich-lanh-dao': 'work_schedule.leadership_registration',
    '/lich-lam-viec/phe-duyet': 'work_schedule.schedule_approval',
    '/lich-lam-viec/loi-moi-tham-du': 'work_schedule.meeting_invitations',
    '/danh-sach-uy-quyen': 'nav_delegation',
    '/he-thong/uy-quyen': 'nav_delegation',
  };

  const translationKey = keyMap[cleanUrl];
  if (translationKey) {
    const translated = i18n.t(translationKey);
    if (translated && translated !== translationKey) {
      return translated;
    }
  }

  return name;
}

export function getFirstMenuPath(flatMenus: any[] | null | undefined): string | null {
  if (!Array.isArray(flatMenus) || flatMenus.length === 0) return null;

  const activeMenus = flatMenus
    .filter((m) => m && m.isActive !== false)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const parentIds = new Set(activeMenus.map((m) => m.parentId).filter(Boolean));

  const normalizeUrl = (url?: string | null): string | null => {
    const trimmed = (url || '').trim();
    if (!trimmed || trimmed === '#') return null;
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  };

  const hasHomeMenu = activeMenus.some((m) => normalizeUrl(m.url) === '/');
  if (hasHomeMenu) return '/';

  const firstLeaf = activeMenus.find((m) => !parentIds.has(m.id) && normalizeUrl(m.url));
  return firstLeaf ? normalizeUrl(firstLeaf.url) : null;
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}


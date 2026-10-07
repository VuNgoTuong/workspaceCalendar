import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useTitle(title?: string, keepOnUnmount = false): void {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';

  useEffect(() => {
    const originalTitle = document.title;
    const defaultAppTitle = currentLang === 'en' ? 'THACO Work Schedule' : 'Lịch làm việc THACO';
    const appTitle = t('app_title', { defaultValue: defaultAppTitle });

    if (!title || title.trim() === '') {
      document.title = appTitle;
    } else {
      // Clean off any hardcoded suffix like '| THACO Work Schedule' or '| Lịch làm việc THACO'
      const cleanTitle = title
        .replace(/\s*\|\s*(THACO Work Schedule|Lịch làm việc THACO)$/i, '')
        .trim();

      document.title = cleanTitle ? `${cleanTitle} | ${appTitle}` : appTitle;
    }

    return () => {
      if (!keepOnUnmount) {
        document.title = originalTitle;
      }
    };
  }, [title, keepOnUnmount, currentLang, t]);
}

export default useTitle;


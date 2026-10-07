import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// Default language is bundled eagerly so first render doesn't wait on an extra chunk request.
import viResources from './locales/vi.json';

export type SupportedLanguage = 'vi' | 'en';

const NAMESPACE = 'translation';
const DEFAULT_LANGUAGE: SupportedLanguage = 'vi';

const localeLoaders: Record<SupportedLanguage, () => Promise<{ default: Record<string, unknown> }>> = {
  vi: () => Promise.resolve({ default: viResources }),
  en: () => import('./locales/en.json'),
};

const loadedLanguages = new Set<string>();

const resolveLoader = (lang: string) => localeLoaders[lang as SupportedLanguage] || localeLoaders[DEFAULT_LANGUAGE];

export async function loadLanguage(lang: string): Promise<void> {
  if (loadedLanguages.has(lang) || i18n.hasResourceBundle(lang, NAMESPACE)) {
    loadedLanguages.add(lang);
    return;
  }
  const { default: resources } = await resolveLoader(lang)();
  i18n.addResourceBundle(lang, NAMESPACE, resources, true, true);
  loadedLanguages.add(lang);
}

export async function switchLanguage(lang: string): Promise<void> {
  await loadLanguage(lang);
  await i18n.changeLanguage(lang);
}

const rawSavedLanguage = localStorage.getItem('language');
const savedLanguage: SupportedLanguage =
  rawSavedLanguage === 'en' || rawSavedLanguage === 'vi' ? rawSavedLanguage : DEFAULT_LANGUAGE;

export const i18nReady: Promise<void> = resolveLoader(savedLanguage)().then(({ default: resources }) => {
  loadedLanguages.add(savedLanguage);
  return i18n
    .use(initReactI18next)
    .init({
      resources: {
        [savedLanguage]: {
          translation: resources,
        },
      },
      lng: savedLanguage,
      fallbackLng: DEFAULT_LANGUAGE,
      interpolation: {
        escapeValue: false,
      },
    })
    .then(() => undefined);
});

export default i18n;

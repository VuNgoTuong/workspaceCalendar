import { create } from 'zustand';

interface ThemeState {
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (mode: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialMode = (localStorage.getItem('theme-mode') as 'light' | 'dark') || 'light';

  if (initialMode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  const applyThemeChange = (nextMode: 'light' | 'dark') => {
    localStorage.setItem('theme-mode', nextMode);
    if (nextMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ themeMode: nextMode });
  };

  return {
    themeMode: initialMode,
    toggleTheme: () => {
      const currentMode = get().themeMode;
      const nextMode = currentMode === 'light' ? 'dark' : 'light';

      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        (document as any).startViewTransition(() => {
          applyThemeChange(nextMode);
        });
      } else {
        applyThemeChange(nextMode);
      }
    },
    setTheme: (mode) => {
      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        (document as any).startViewTransition(() => {
          applyThemeChange(mode);
        });
      } else {
        applyThemeChange(mode);
      }
    },
  };
});

export default useThemeStore;

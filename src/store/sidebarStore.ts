import { create } from 'zustand';

interface SidebarState {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

const readInitialCollapsed = () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: readInitialCollapsed(),
  setCollapsed: (collapsed) => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    set({ collapsed });
  },
  toggle: () => {
    const next = !get().collapsed;
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    set({ collapsed: next });
  },
}));

export default useSidebarStore;

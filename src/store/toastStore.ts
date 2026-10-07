import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (type: ToastType, title: string, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, title, message, duration = 2500) => {
    if (!message) return;
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => {
      const isDuplicate = state.toasts.some((t) => t.type === type && t.message === message);
      if (isDuplicate) return state;
      return {
        toasts: [...state.toasts, { id, type, title, message, duration }],
      };
    });
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = {
  success: (message: string, title = 'Success!', duration?: number) =>
    useToastStore.getState().addToast('success', title, message, duration),
  error: (message: string, title = 'Error!', duration?: number) =>
    useToastStore.getState().addToast('error', title, message, duration),
  warning: (message: string, title = 'Warning!', duration?: number) =>
    useToastStore.getState().addToast('warning', title, message, duration),
  info: (message: string, title = 'Help!', duration?: number) =>
    useToastStore.getState().addToast('info', title, message, duration),
};

export default toast;

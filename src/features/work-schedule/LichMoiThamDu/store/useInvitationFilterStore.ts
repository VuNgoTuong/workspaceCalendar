import { create } from 'zustand';
import { EMPTY_INVITATION_FILTERS, type InvitationFilters } from '../types';

export type InvitationTabKey = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'all';

interface InvitationFilterState {
  activeTab: InvitationTabKey;
  filters: InvitationFilters;
  setActiveTab: (tab: InvitationTabKey) => void;
  setFilters: (patch: Partial<InvitationFilters>) => void;
  resetFilters: () => void;
}

export const useInvitationFilterStore = create<InvitationFilterState>((set) => ({
  activeTab: 'all',
  filters: EMPTY_INVITATION_FILTERS,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  resetFilters: () => set({ filters: EMPTY_INVITATION_FILTERS }),
}));

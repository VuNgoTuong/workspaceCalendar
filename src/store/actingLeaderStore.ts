import { create } from 'zustand';
import { safeJsonParse } from '../utils/helpers';

const STORAGE_KEY = 'acting_leader';
const CHECKED_KEY = 'acting_leader_checked';
const OPTIONS_KEY = 'acting_leader_options';

export interface ActingLeader {
  id: string;
  fullname: string;
  departmentId: string;
  departmentName: string;
  positionName: string;
  avatarUrl: string;
}

interface ActingLeaderState {
  actingLeader: ActingLeader | null;
  hasChecked: boolean;
  availableLeaders: ActingLeader[];
  setActingLeader: (leader: ActingLeader) => void;
  clearActingLeader: () => void;
  setAvailableLeaders: (leaders: ActingLeader[]) => void;
  reset: () => void;
}

const readInitial = (): ActingLeader | null => safeJsonParse(sessionStorage.getItem(STORAGE_KEY), null);
const readChecked = (): boolean => sessionStorage.getItem(CHECKED_KEY) === 'true';
const readOptions = (): ActingLeader[] => safeJsonParse(sessionStorage.getItem(OPTIONS_KEY), []);

export const useActingLeaderStore = create<ActingLeaderState>((set) => ({
  actingLeader: readInitial(),
  hasChecked: readChecked(),
  availableLeaders: readOptions(),

  setActingLeader: (leader) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(leader));
    sessionStorage.setItem(CHECKED_KEY, 'true');
    set({ actingLeader: leader, hasChecked: true });
  },

  clearActingLeader: () => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.setItem(CHECKED_KEY, 'true');
    set({ actingLeader: null, hasChecked: true });
  },

  setAvailableLeaders: (leaders) => {
    sessionStorage.setItem(OPTIONS_KEY, JSON.stringify(leaders));
    set({ availableLeaders: leaders });
  },

  reset: () => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(CHECKED_KEY);
    sessionStorage.removeItem(OPTIONS_KEY);
    set({ actingLeader: null, hasChecked: false, availableLeaders: [] });
  },
}));

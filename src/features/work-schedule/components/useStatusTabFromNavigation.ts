import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Navigation state other pages (e.g. the dashboard) pass to open a list on a specific status tab. */
export interface StatusTabNavigationState {
  statusTab?: string;
}

/**
 * Applies `location.state.statusTab` to the page's tab state when it is one of `validTabs`.
 * Re-runs on every navigation, so clicking another status from the dashboard switches tabs even if the page stays mounted.
 */
export const useStatusTabFromNavigation = <T extends string>(validTabs: readonly T[], setTab: (tab: T) => void) => {
  const location = useLocation();
  const requested = (location.state as StatusTabNavigationState | null)?.statusTab;

  useEffect(() => {
    if (requested && (validTabs as readonly string[]).includes(requested)) {
      setTab(requested as T);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
};

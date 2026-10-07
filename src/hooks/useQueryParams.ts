import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Custom hook to get and set URL query parameters easily.
 */
export function useQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }, [searchParams]);

  /**
   * Set or update specific query parameters.
   */
  const setQueryParams = useCallback(
    (newParams: Record<string, any>, replace = false) => {
      const updated = new URLSearchParams(searchParams.toString());
      
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          updated.delete(key);
        } else {
          updated.set(key, String(value));
        }
      });

      setSearchParams(updated, { replace });
    },
    [searchParams, setSearchParams]
  );

  /**
   * Clear all or specific query parameters.
   */
  const clearQueryParams = useCallback(
    (keys?: string[]) => {
      if (!keys) {
        setSearchParams(new URLSearchParams(), { replace: true });
        return;
      }

      const updated = new URLSearchParams(searchParams.toString());
      keys.forEach((key) => updated.delete(key));
      setSearchParams(updated, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return {
    queryParams,
    setQueryParams,
    clearQueryParams,
    searchParams,
  };
}

export default useQueryParams;


import { useState, useCallback } from 'react';

export function useToggle(initialValue = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState<boolean>(initialValue);

  const toggle = useCallback(() => {
    setValue((v) => !v);
  }, []);

  const setManual = useCallback((newValue: boolean) => {
    setValue(newValue);
  }, []);

  return [value, toggle, setManual];
}

export default useToggle;

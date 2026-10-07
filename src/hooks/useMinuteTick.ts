import { useEffect, useState } from 'react';

export function useMinuteTick(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return tick;
}

export default useMinuteTick;

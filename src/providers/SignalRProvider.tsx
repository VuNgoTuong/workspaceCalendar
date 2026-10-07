import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { signalRService } from '../services/signalr/SignalRService';

export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      signalRService.start().catch((err) => {
        console.error(err);
      });
    } else {
      signalRService.stop().catch((err) => {
        console.error(err);
      });
    }
  }, [isAuthenticated]);

  return <>{children}</>;
};

export default SignalRProvider;

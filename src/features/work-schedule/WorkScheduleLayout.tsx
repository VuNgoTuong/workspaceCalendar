import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PageLoader } from '../../components/ui/PageLoader';
import { SpeedDialMenu } from '../../components/ui/SpeedDialMenu';

export const WorkScheduleLayout: React.FC = () => {
  return (
    <div className="relative flex flex-col xl:h-full xl:min-h-0 gap-3">
      <div className="relative flex-1 min-h-0">
        <Suspense fallback={<div className="flex h-full items-center justify-center"><PageLoader /></div>}>
          <Outlet />
        </Suspense>
      </div>

      <SpeedDialMenu />
    </div>
  );
};

export default WorkScheduleLayout;



import React from 'react';
import Employee from './employee/Employee';
import Role from './role/Role';
import NotificationTemplate from './notification-template/NotificationTemplate';

interface SystemFeatureProps {
  activeTab: string;
}

export const SystemFeature: React.FC<SystemFeatureProps> = ({ activeTab }) => {
  switch (activeTab) {
    case 'system_employees':
      return <Employee />;
    case 'system_roles':
      return <Role />;
    case 'system_mail_config':
      return <NotificationTemplate />;
    default:
      return null;
  }
};
export default SystemFeature;

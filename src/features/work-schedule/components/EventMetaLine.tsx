import React from 'react';
import { MapPin, UserRound, Users, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EventMetaLineProps {
  location?: string | null;
  online?: boolean;
  host?: string | null;
}

export const EventMetaLine: React.FC<EventMetaLineProps> = ({ location, online, host }) => {
  const { t } = useTranslation();
  if (!location && online === undefined && !host) return null;

  return (
    <div className="flex items-center gap-x-3 gap-y-0.5 min-w-0 text-[11px] opacity-80 overflow-hidden whitespace-nowrap">
      {location && (
        <span className="inline-flex items-center gap-1 min-w-0">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{location}</span>
        </span>
      )}
      {online !== undefined && (
        <span className="inline-flex items-center gap-1 shrink-0">
          {online ? <Video size={11} className="shrink-0" /> : <Users size={11} className="shrink-0" />}
          {t(online ? 'schedule_approval.mode_online' : 'schedule_approval.mode_offline')}
        </span>
      )}
      {host && (
        <span className="inline-flex items-center gap-1 min-w-0">
          <UserRound size={11} className="shrink-0" />
          <span className="truncate">
            {t('leadership_schedule.tooltip_host')}: {host}
          </span>
        </span>
      )}
    </div>
  );
};

export default EventMetaLine;

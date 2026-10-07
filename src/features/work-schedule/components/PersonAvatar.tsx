import React, { useState } from 'react';
import { cn, resolveAttachmentUrl } from '../../../utils/helpers';

const initialsOf = (name?: string | null) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

interface PersonAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  /** Tailwind size classes, e.g. "h-6 w-6". */
  className?: string;
  /** Font size class for the initials fallback. */
  textClassName?: string;
}

/** Round avatar image with an initials fallback when there's no photo (or it fails to load). */
export const PersonAvatar: React.FC<PersonAvatarProps> = ({ name, avatarUrl, className = 'h-6 w-6', textClassName = 'text-[9.5px]' }) => {
  const [failed, setFailed] = useState(false);

  if (avatarUrl && !failed) {
    return (
      <img
        loading="lazy"
        decoding="async"
        src={resolveAttachmentUrl(avatarUrl)}
        alt={name || ''}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn('shrink-0 rounded-full object-contain bg-white border border-slate-200 dark:border-slate-700', className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/60 font-semibold text-[#00529C] dark:text-blue-300 border border-blue-100 dark:border-blue-900/60',
        className,
        textClassName
      )}
    >
      {initialsOf(name)}
    </div>
  );
};

export default PersonAvatar;

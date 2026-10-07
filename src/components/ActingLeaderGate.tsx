import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useActingLeaderStore, type ActingLeader } from '../store/actingLeaderStore';
import { delegationAPI, type IMyLeaderDelegation } from '../services/api/delegationAPI';
import { resolveAttachmentUrl } from '../utils/helpers';
import { ActingLeaderBackdrop } from './shared/ActingLeaderBackdrop';
import { PageLoader } from './ui/PageLoader';

// Only shown to delegated users; loading it lazily keeps MUI out of the initial bundle.
const loadActingLeaderModal = () => import('./shared/ActingLeaderModal');
const ActingLeaderModal = lazy(loadActingLeaderModal);

type GateStatus = 'checking' | 'blocked' | 'ready';

const toActingLeader = (delegation: IMyLeaderDelegation): ActingLeader => ({
  id: delegation.leader.id,
  fullname: delegation.leader.fullname,
  departmentId: delegation.leader.departmentId,
  departmentName: delegation.leader.departmentName,
  positionName: delegation.leader.positionName,
  avatarUrl: delegation.leader.avatarUrl,
});

function CurrentUserCorner() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [imgError, setImgError] = useState(false);

  if (!user) return null;

  const initials = user.name.trim().split(/\s+/).slice(-2).map((n) => n[0]).join('').toUpperCase();

  return (
    <div className="fixed top-6 right-5 z-[1400] flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pl-1.5 pr-1 shadow-lg backdrop-blur-md">
      {user.avatarUrl && !imgError ? (
        <img
          src={resolveAttachmentUrl(user.avatarUrl)}
          alt={user.name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-6 w-6 shrink-0 rounded-full object-contain bg-white"
        />
      ) : (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-10 font-semibold text-white">
          {initials}
        </div>
      )}
      <span className="max-w-[120px] truncate text-12 font-medium text-white/90">{user.name}</span>
      <button
        type="button"
        onClick={logout}
        title={t('logout')}
        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-red-500/20 hover:text-red-300"
      >
        <LogOut size={13} />
      </button>
    </div>
  );
}

export function ActingLeaderGate({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const clearActingLeader = useActingLeaderStore((s) => s.clearActingLeader);
  const setActingLeader = useActingLeaderStore((s) => s.setActingLeader);
  const setAvailableLeaders = useActingLeaderStore((s) => s.setAvailableLeaders);
  const [status, setStatus] = useState<GateStatus>('checking');
  const [pendingLeaders, setPendingLeaders] = useState<IMyLeaderDelegation[]>([]);
  const checkedRef = useRef(false);

  const assignLeader = (delegation: IMyLeaderDelegation | null) => {
    if (delegation) {
      setActingLeader(toActingLeader(delegation));
    } else {
      clearActingLeader();
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      checkedRef.current = false;
      setStatus('ready');
      return;
    }
    if (checkedRef.current) return;
    checkedRef.current = true;

    if (useActingLeaderStore.getState().hasChecked) {
      setStatus('ready');
      return;
    }

    setStatus('checking');

    // Fetch the modal chunk alongside the API call so the backdrop never shows without the modal.
    const modalReady = loadActingLeaderModal().catch(() => undefined);

    delegationAPI
      .getMyLeaderCached()
      .then((list) => {
        const active = (list || []).filter((d) => d.isActive && d.leaderId !== userId);

        if (active.length === 0) {
          clearActingLeader();
          setStatus('ready');
          return;
        }

        setAvailableLeaders(active.map(toActingLeader));

        return modalReady.then(() => {
          setPendingLeaders(active);
          setStatus('blocked');
        });
      })
      .catch((e) => {
        console.error(e);
        setStatus('ready');
      });
  }, [isAuthenticated, userId, clearActingLeader, setAvailableLeaders]);

  if (status === 'checking') {
    return <PageLoader fullScreen />;
  }

  if (status === 'blocked') {
    return (
      <>
        <ActingLeaderBackdrop />
        <CurrentUserCorner />
        <Suspense fallback={<PageLoader fullScreen />}>
          <ActingLeaderModal
            open
            delegations={pendingLeaders}
            onConfirm={(delegation) => {
              assignLeader(delegation);
              setPendingLeaders([]);
              setStatus('ready');
            }}
          />
        </Suspense>
      </>
    );
  }

  return <>{children}</>;
}

export default ActingLeaderGate;

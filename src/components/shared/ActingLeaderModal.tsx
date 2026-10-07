import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from '@mui/material';
import { ChevronDown, Crown, Calendar, Check, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { IMyLeaderDelegation } from '../../services/api/delegationAPI';
import { resolveAttachmentUrl } from '../../utils/helpers';
import { useAuthStore } from '../../store/authStore';
import { useCurrentUserQuery } from '../../hooks/useCurrentUserQuery';

const AVATAR_PALETTE = [
  'bg-blue-500/20 text-blue-300 border border-blue-400/30',
  'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30',
  'bg-sky-500/20 text-sky-300 border border-sky-400/30',
  'bg-purple-500/20 text-purple-300 border border-purple-400/30',
  'bg-slate-500/20 text-slate-300 border border-slate-400/30',
];

function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarClass(name: string): string {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[hash];
}

interface ActingLeaderModalProps {
  open: boolean;
  delegations: IMyLeaderDelegation[];
  onConfirm: (delegation: IMyLeaderDelegation | null) => void;
}

const AVATAR_SIZE_CLASS = {
  xs: 'h-6 w-6 text-10',
  sm: 'h-8 w-8 text-11',
  md: 'h-10 w-10 text-12',
  lg: 'h-12 w-12 text-14',
};

const AvatarCell: React.FC<{ name: string; avatarUrl?: string; size?: keyof typeof AVATAR_SIZE_CLASS }> = ({
  name,
  avatarUrl,
  size = 'md',
}) => {
  const [imgError, setImgError] = useState(false);
  const sizeClass = AVATAR_SIZE_CLASS[size];

  const validAvatarUrl = Boolean(avatarUrl && avatarUrl.trim() !== '');

  if (validAvatarUrl && !imgError) {
    return (
      <img
        src={resolveAttachmentUrl(avatarUrl)}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeClass} shrink-0 rounded-full object-contain shadow-xs bg-white`}
      />
    );
  }

  return (
    <div className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full font-semibold shadow-xs ${getAvatarClass(name)}`}>
      {getInitials(name)}
    </div>
  );
};

const leaderInfo = (d: IMyLeaderDelegation, fallbackName: string) => {
  const leader = d.leader;
  const avatarUrl = leader?.avatarUrl || (leader as any)?.avatar || (d as any)?.avatarUrl || (d as any)?.avatar || '';
  return {
    fullname: leader?.fullname || fallbackName,
    avatarUrl,
    position: leader?.positionName || leader?.jobTitleName || '',
    department: leader?.departmentName || leader?.unitName || leader?.unitFullPathName || '',
    dateRange:
      d.startDate && d.endDate ? `${dayjs(d.startDate).format('DD/MM/YYYY')} - ${dayjs(d.endDate).format('DD/MM/YYYY')}` : null,
  };
};

const SELF_ID = 'SELF';

export const ActingLeaderModal: React.FC<ActingLeaderModalProps> = ({ open, delegations = [], onConfirm }) => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: currentUserProfile } = useCurrentUserQuery();
  const [selectedId, setSelectedId] = useState<string>(SELF_ID);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDropdownOpen) searchInputRef.current?.focus({ preventScroll: true });
  }, [isDropdownOpen]);

  useEffect(() => {
    if (open) {
      setSelectedId(SELF_ID);
      setIsDropdownOpen(false);
      setSearchQuery('');
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!open) return;
    [user?.avatarUrl, ...delegations.map((d) => leaderInfo(d, '').avatarUrl)].forEach((url) => {
      if (url && url.trim() !== '') new Image().src = resolveAttachmentUrl(url);
    });
  }, [open, delegations, user?.avatarUrl]);

  const selectedDelegation = delegations.find((d) => d.id === selectedId);
  const fallbackName = t('delegation.acting_leader_default');

  const selfName = user?.name || t('delegation.self_fallback_name');
  const selfPosition =
    currentUserProfile?.positionName ||
    currentUserProfile?.jobTitleName ||
    currentUserProfile?.positions?.[0]?.name ||
    currentUserProfile?.jobTitles?.[0]?.name ||
    '';
  const selfDepartment =
    currentUserProfile?.departmentName ||
    currentUserProfile?.unitName ||
    currentUserProfile?.unitFullPathName ||
    currentUserProfile?.departments?.[0]?.name ||
    '';

  const isSelf = selectedId === SELF_ID;
  const currentLeaderInfo = selectedDelegation ? leaderInfo(selectedDelegation, fallbackName) : null;
  const activeName = isSelf ? selfName : currentLeaderInfo?.fullname || '';
  const activeAvatar = isSelf ? user?.avatarUrl : currentLeaderInfo?.avatarUrl;
  const activePosition = isSelf ? selfPosition : currentLeaderInfo?.position;
  const activeDepartment = isSelf ? selfDepartment : currentLeaderInfo?.department;

  const q = searchQuery.toLowerCase().trim();
  const isSelfMatch =
    !q ||
    selfName.toLowerCase().includes(q) ||
    selfPosition.toLowerCase().includes(q) ||
    selfDepartment.toLowerCase().includes(q) ||
    t('header.personal_account').toLowerCase().includes(q);

  const filteredDelegations = delegations.filter((d) => {
    if (!q) return true;
    const info = leaderInfo(d, fallbackName);
    return (
      info.fullname.toLowerCase().includes(q) ||
      info.position.toLowerCase().includes(q) ||
      info.department.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog
      open={open}
      onClose={() => {}}
      scroll="paper"
      slotProps={{
        paper: {
          className: '!overflow-visible !bg-transparent !rounded-[24px]',
          style: {
            width: 620,
            maxWidth: '94vw',
            borderRadius: 24,
            boxShadow:
              '0 0 0 1px rgba(96,165,250,0.06), 0 0 60px rgba(59,130,246,0.16), 0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          },
        },
        backdrop: {
          style: {
            backgroundColor: 'rgba(3, 7, 18, 0.25)',
          },
        },
      }}
    >
      <div className="acting-leader-modal-in relative rounded-[24px]">
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1e3064] via-[#22386f] to-[#1a2a58] text-slate-100">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,255,0.6) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#f5c451]/55 bg-[radial-gradient(circle_at_35%_30%,#3a2f12,#1a1508)] shadow-[0_0_0_4px_rgba(245,196,81,0.07),0_0_22px_rgba(245,196,81,0.35)]">
              <Crown size={19} className="text-[#f5c451]" />
            </div>
            <span className="acting-leader-gold-text text-[18px] font-semibold tracking-tight">
              {t('delegation.acting_badge')}
            </span>
          </div>
          <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px origin-bottom scale-y-50 bg-gradient-to-r from-transparent via-[#f5c451]/80 to-transparent" />
        </div>

        <div className="relative flex flex-col px-6 pt-4 pb-3" ref={dropdownRef}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className={`group relative flex items-center justify-between gap-3.5 rounded-2xl p-4 cursor-pointer transition-colors duration-200 select-none ${
              isDropdownOpen
                ? 'border-2 border-blue-400 bg-white/[0.09] shadow-[0_0_24px_rgba(59,130,246,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]'
                : 'border border-white/[0.14] bg-white/[0.06] hover:bg-white/[0.09] hover:border-blue-400/40 shadow-[0_10px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)]'
            }`}
          >
            <div key={selectedId} className="acting-leader-card-in flex items-start gap-3.5 min-w-0 flex-1">
              <AvatarCell key={activeAvatar || activeName} name={activeName} avatarUrl={activeAvatar} size="lg" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-[15px] font-semibold text-white leading-tight truncate">{activeName}</h4>
                  {isSelf && (
                    <span className="shrink-0 px-2 py-0.5 text-[11px] font-medium rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {t('header.personal_account')}
                    </span>
                  )}
                </div>

                {(activePosition || activeDepartment) && (
                  <div className="mt-1 text-[12px] text-slate-400 truncate">
                    {[activePosition, activeDepartment].filter(Boolean).join(' - ')}
                  </div>
                )}

                {!isSelf && currentLeaderInfo?.dateRange && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-amber-300/90">
                    <Calendar size={11} className="shrink-0" />
                    <span>
                      <span className="font-normal text-slate-400">{t('delegation.acting_duration')}:</span>{' '}
                      {currentLeaderInfo.dateRange}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.08] group-hover:bg-blue-500/25 border border-white/10 group-hover:border-blue-400/40 transition-colors shrink-0">
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180 text-blue-300' : 'text-slate-400 group-hover:text-white'
                }`}
              />
            </div>
          </div>

          <div
            aria-hidden={!isDropdownOpen}
            inert={!isDropdownOpen}
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isDropdownOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={`mt-3 rounded-2xl border border-white/[0.16] bg-[#15244f] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-3 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isDropdownOpen ? 'translate-y-0' : '-translate-y-2'
                }`}
              >
                {delegations.length >= 2 && (
                  <div className="relative mb-2.5">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('delegation.acting_search_placeholder')}
                      className="w-full h-9 pl-9 pr-8 rounded-xl bg-white/[0.06] border border-white/15 text-[12.5px] text-white placeholder-slate-400/70 focus:outline-none focus:border-blue-400/60 focus:bg-white/[0.1] transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto page-scroll pr-1">
                  {isSelfMatch && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedId(SELF_ID);
                        setIsDropdownOpen(false);
                      }}
                      className={`group flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-[background-color,transform] duration-150 hover:translate-x-0.5 ${
                        selectedId === SELF_ID
                          ? 'bg-blue-600/25 border border-blue-400/40 text-white shadow-[0_0_14px_rgba(59,130,246,0.2)]'
                          : 'hover:bg-white/[0.07] border border-transparent text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="rounded-full p-0.5 ring-2 ring-blue-400/50 shrink-0">
                          <AvatarCell name={selfName} avatarUrl={user?.avatarUrl} size="sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-white truncate">{selfName}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                              {t('header.personal_account')}
                            </span>
                          </div>
                          {(selfPosition || selfDepartment) && (
                            <div className="text-[11.5px] text-slate-400 truncate mt-0.5">
                              {[selfPosition, selfDepartment].filter(Boolean).join(' - ')}
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedId === SELF_ID && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)]">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  )}

                  {isSelfMatch && filteredDelegations.length > 0 && <div className="mx-1 my-0.5 h-px shrink-0 bg-white/10" />}

                  {filteredDelegations.map((d) => {
                    const info = leaderInfo(d, fallbackName);
                    const isSelected = selectedId === d.id;
                    return (
                      <div
                        key={d.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedId(d.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`group flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-[background-color,transform] duration-150 hover:translate-x-0.5 ${
                          isSelected
                            ? 'bg-blue-600/25 border border-blue-400/40 text-white shadow-[0_0_14px_rgba(59,130,246,0.2)]'
                            : 'hover:bg-white/[0.07] border border-transparent text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="rounded-full p-0.5 ring-2 ring-amber-400/50 shrink-0">
                            <AvatarCell name={info.fullname} avatarUrl={info.avatarUrl} size="sm" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Crown size={13} className="shrink-0 text-amber-400" />
                              <span className="text-[13px] font-semibold text-white truncate">{info.fullname}</span>
                            </div>
                            {(info.position || info.department) && (
                              <div className="text-[11.5px] text-slate-400 truncate mt-0.5">
                                {[info.position, info.department].filter(Boolean).join(' - ')}
                              </div>
                            )}
                            {info.dateRange && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-300/80 mt-1">
                                <Calendar size={11} className="shrink-0 text-blue-400" />
                                <span>
                                  <span className="text-slate-400">{t('delegation.acting_duration')}:</span> {info.dateRange}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)]">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!isSelfMatch && filteredDelegations.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-[12.5px]">
                      {t('delegation.acting_search_empty')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <span className="text-[12px] font-normal text-slate-400">
            {t('delegation.acting_required_note_multi', { defaultValue: 'Bắt buộc chọn 1 lãnh đạo để tiếp tục' })}
          </span>
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => {
              if (selectedId === SELF_ID) {
                onConfirm(null);
              } else if (selectedDelegation) {
                onConfirm(selectedDelegation);
              }
            }}
            className="group relative inline-flex items-center justify-center gap-2 h-9.5 px-6 text-13.5 font-medium text-white hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-[0.98] transition-all duration-200 ease-out cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none disabled:transform-none select-none shrink-0 rounded-full bg-gradient-to-r from-[#0066C7] via-[#0082E6] to-[#0066C7] hover:brightness-110 shadow-sm shadow-[#0066C7]/25 hover:shadow-md hover:shadow-[#0066C7]/35"
          >
            <Check size={16} strokeWidth={2.2} className="transition-transform duration-200 group-hover:scale-110" />
            <span>{t('delegation.acting_confirm_ok', { defaultValue: 'Xác nhận' })}</span>
          </button>
        </div>
      </div>
      <div className="acting-leader-border-beam" />
      </div>
    </Dialog>
  );
};

export default ActingLeaderModal;

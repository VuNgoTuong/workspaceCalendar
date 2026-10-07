import { toast } from '../../../store/toastStore';
import React, { useState } from 'react';
import { Button, Input, Modal } from 'antd';
import {
  Edit3,
  Key,
  Mail,
  Phone,
  Building2,
  Camera,
  User as UserIcon,
  CheckCircle,
  X,
  Briefcase,
  Palette,
  Sun,
  Moon,
  Calendar,
  CreditCard,
  Eye,
  EyeOff
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
import { useCurrentUserQuery } from '../../../hooks/useCurrentUserQuery';
import { Tooltip } from '../../../components/ui/Tooltip';
import { switchLanguage } from '../../../i18n';

const VietnamFlag: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 3 2"
    style={{ width: '20px', height: '14px' }}
    className="rounded-sm border border-slate-200 dark:border-slate-700 select-none block flex-shrink-0"
  >
    <rect width="3" height="2" fill="#da251d" />
    <polygon
      points="1.5,0.4 1.62,0.85 2.1,0.85 1.71,1.13 1.86,1.6 1.5,1.3 1.14,1.6 1.29,1.13 0.9,0.85 1.38,0.85"
      fill="#ffff00"
    />
  </svg>
);

const UKFlag: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 60 30"
    style={{ width: '20px', height: '14px' }}
    className="rounded-sm border border-slate-200 dark:border-slate-700 select-none block flex-shrink-0"
  >
    <rect width="60" height="30" fill="#012169" />
    <path d="M0,0 L60,30 M0,30 L60,0" stroke="#fff" strokeWidth="6" />
    <path d="M0,0 L60,30 M0,30 L60,0" stroke="#c8102e" strokeWidth="4" />
    <path d="M0,15 L60,15 M30,0 L30,30" stroke="#fff" strokeWidth="10" />
    <path d="M0,15 L60,15 M30,0 L30,30" stroke="#c8102e" strokeWidth="6" />
  </svg>
);

interface InfoItemProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value, icon }) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-400 dark:text-slate-500 tracking-wider">{label}</p>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate">{value}</p>
    </div>
  </div>
);

export const UserProfile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { themeMode, setTheme } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  // Shared cached query (also used elsewhere) instead of a fresh request on every visit.
  const { data: profile } = useCurrentUserQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const displayName = profile?.fullname || user?.name || '';
  const displayEmail = profile?.email || user?.email || '';
  const displayPhone = profile?.phoneNumber || '';
  const displayEmployeeCode = profile?.employeeCode || '';
  const displayUnit = profile?.unitName || '';
  const displayTitle = profile?.jobTitles?.[0]?.name || profile?.positions?.[0]?.name || '';
  const displayDepartment = profile?.departments?.[0]?.name || '';
  const displayRoles = profile?.roles?.join(', ') || user?.role || '';
  const avatarUrl = profile?.avatarUrl || user?.avatarUrl;

  const currentLang = i18n.language || 'vi';

  const canChangePassword = localStorage.getItem('LOGIN_TYPE') === 'employee_code';

  const checks = {
    length: passwordForm.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(passwordForm.newPassword),
    lowercase: /[a-z]/.test(passwordForm.newPassword),
    number: /[0-9]/.test(passwordForm.newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.newPassword),
  };

  const strengthScore = Object.values(checks).filter(Boolean).length;

  let strengthKey = 'empty';
  let strengthColor = 'bg-slate-200 dark:bg-slate-800';
  let textColor = 'text-slate-400 dark:text-slate-500';

  if (strengthScore === 5) {
    strengthKey = 'strong';
    strengthColor = 'bg-green-500';
    textColor = 'text-green-500';
  } else if (strengthScore >= 3) {
    strengthKey = 'medium';
    strengthColor = 'bg-amber-500';
    textColor = 'text-amber-500';
  } else if (strengthScore > 0) {
    strengthKey = 'weak';
    strengthColor = 'bg-red-500';
    textColor = 'text-red-500';
  }

  const handleResetForm = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    toast.info(t('profile.messages.reset_success'));
  };

  const handleSavePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error(t('profile.messages.fill_required'));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('profile.messages.password_mismatch'));
      return;
    }
    if (strengthScore < 3) {
      toast.error(t('profile.messages.password_weak'));
      return;
    }

    setIsSaving(true);
    setTimeout(() => {
      toast.success(t('profile.messages.change_success'));
      setIsSaving(false);
      setIsModalOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Banner / Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-5 text-center sm:text-left">
          <div className="relative flex-shrink-0">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 shadow-md object-contain bg-white"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 flex items-center justify-center text-3xl font-medium border-4 border-white dark:border-slate-900 shadow-md">
                {(displayName.split(' ').pop()?.substring(0, 2).toUpperCase() || 'NV')}
              </div>
            )}
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-500 transition-colors shadow-sm cursor-pointer">
              <Camera size={14} />
            </button>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 justify-center sm:justify-start">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{displayName}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                {displayRoles}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              {displayTitle}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {t('profile.last_updated', { date: '02/07/2026' })}
            </p>
          </div>
        </div>

        <Button
          type="primary"
          disabled
          icon={<Edit3 size={15} />}
          className="flex items-center gap-1.5 h-10 px-5 font-semibold text-sm self-center md:self-auto"
        >
          {t('profile.edit_profile')}
        </Button>
      </div>

      {/* Account Info Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500">
            <UserIcon size={15} />
          </div>
          {t('profile.account_info')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          <InfoItem label={t('profile.fields.fullname')} value={displayName} icon={<UserIcon size={16} />} />
          <InfoItem label={t('profile.fields.login_email')} value={displayEmail} icon={<Mail size={16} />} />
          <InfoItem label={t('profile.fields.phone')} value={displayPhone} icon={<Phone size={16} />} />

          <InfoItem label={t('profile.fields.employee_id')} value={displayEmployeeCode} icon={<CreditCard size={16} />} />
          <InfoItem label={t('profile.fields.unit')} value={displayUnit} icon={<Building2 size={16} />} />
          <InfoItem label={t('profile.fields.title')} value={displayTitle} icon={<Briefcase size={16} />} />

          <InfoItem label={t('profile.fields.contact_email')} value={displayEmail} icon={<Mail size={16} />} />
          <InfoItem label={t('profile.fields.department')} value={displayDepartment} icon={<Building2 size={16} />} />
          <InfoItem label={t('profile.fields.updated_date')} value="02/07/2026" icon={<Calendar size={16} />} />
        </div>
      </div>

      {/* Bottom Side-by-Side Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-950/40 flex items-center justify-center text-green-500">
                <CheckCircle size={15} />
              </div>
              {t('profile.security')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('profile.security_desc')}
            </p>
          </div>

          <Tooltip title={canChangePassword ? '' : t('profile.change_password_disabled_tooltip')}>
            <span className="inline-flex self-start">
              <Button
                onClick={() => setIsModalOpen(true)}
                disabled={!canChangePassword}
                icon={<Key size={14} />}
                className="flex items-center gap-1.5 h-10 px-5 font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-500"
              >
                {t('profile.change_password')}
              </Button>
            </span>
          </Tooltip>
        </div>

        {/* Settings Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500">
              <Palette size={15} />
            </div>
            {t('profile.system_settings')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Language Column */}
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                {t('profile.language')}
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    switchLanguage('vi');
                    localStorage.setItem('language', 'vi');
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer text-left ${
                    currentLang === 'vi'
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-500/50'
                      : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <VietnamFlag />
                  Tiếng Việt
                </button>
                <button
                  onClick={() => {
                    switchLanguage('en');
                    localStorage.setItem('language', 'en');
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer text-left ${
                    currentLang === 'en'
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-500/50'
                      : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <UKFlag />
                  English
                </button>
              </div>
            </div>

            {/* Appearance Column */}
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                {t('profile.appearance')}
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer text-left ${
                    themeMode === 'light'
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-500/50'
                      : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Sun size={15} />
                  {t('profile.appearance_light')}
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer text-left ${
                    themeMode === 'dark'
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-500/50'
                      : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Moon size={15} />
                  {t('profile.appearance_dark')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={680}
        mask={{ closable: false }}
        title={
          <div className="flex justify-between items-center pr-6">
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-lg">{t('profile.change_password')}</span>
          </div>
        }
        closeIcon={<X size={18} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mt-1" />}
        footer={
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={handleResetForm} className="h-11 px-5 rounded-xl border-slate-200 dark:border-slate-700">
              {t('profile.reset')}
            </Button>
            <Button
              type="primary"
              onClick={handleSavePassword}
              loading={isSaving}
              className="h-11 px-6 rounded-xl bg-blue-600 font-medium"
            >
              {t('profile.save_changes')}
            </Button>
          </div>
        }
        styles={{
          body: { padding: '24px 0 12px 0' }
        }}
      >
        <div className="flex flex-col gap-6">
          <div>
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 block">
              {t('profile.current_password')} <span className="text-red-500">*</span>
            </label>
            <Input.Password
              placeholder="••••••••"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="h-11 rounded-xl"
              iconRender={(visible) => (visible ? <EyeOff size={16} /> : <Eye size={16} />)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 block">
              {t('profile.new_password')} <span className="text-red-500">*</span>
            </label>
            <Input.Password
              placeholder="••••••••"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="h-11 rounded-xl"
              iconRender={(visible) => (visible ? <EyeOff size={16} /> : <Eye size={16} />)}
            />
          </div>

          {/* Password Strength Indicator */}
          <div className="px-0.5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">{t('profile.password_strength.label')}</span>
              <span className={`text-sm font-semibold ${textColor}`}>{t(`profile.password_strength.${strengthKey}`)}</span>
            </div>

            <div className="flex gap-1 h-1.5 mb-3.5">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    level <= strengthScore ? strengthColor : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* Checklist */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle
                  size={14}
                  className={`transition-colors ${checks.length ? 'text-green-500' : 'text-slate-300 dark:text-slate-700'}`}
                />
                <span className={`text-sm ${checks.length ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                  {t('profile.password_rules.length')}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle
                  size={14}
                  className={`transition-colors ${checks.uppercase ? 'text-green-500' : 'text-slate-300 dark:text-slate-700'}`}
                />
                <span className={`text-sm ${checks.uppercase ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                  {t('profile.password_rules.uppercase')}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle
                  size={14}
                  className={`transition-colors ${checks.lowercase ? 'text-green-500' : 'text-slate-300 dark:text-slate-700'}`}
                />
                <span className={`text-sm ${checks.lowercase ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                  {t('profile.password_rules.lowercase')}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle
                  size={14}
                  className={`transition-colors ${checks.number ? 'text-green-500' : 'text-slate-300 dark:text-slate-700'}`}
                />
                <span className={`text-sm ${checks.number ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                  {t('profile.password_rules.number')}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle
                  size={14}
                  className={`transition-colors ${checks.special ? 'text-green-500' : 'text-slate-300 dark:text-slate-700'}`}
                />
                <span className={`text-sm ${checks.special ? 'text-slate-700 dark:text-slate-300 font-normal' : 'text-slate-400 dark:text-slate-500'}`}>
                  {t('profile.password_rules.special')}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 block">
              {t('profile.confirm_password')} <span className="text-red-500">*</span>
            </label>
            <Input.Password
              placeholder="••••••••"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="h-11 rounded-xl"
              iconRender={(visible) => (visible ? <EyeOff size={16} /> : <Eye size={16} />)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserProfile;

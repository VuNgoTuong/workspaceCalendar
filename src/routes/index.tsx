import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import {
  Archive,
  CheckSquare,
  BarChart3,
  Bell,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';
import { PageLoader } from '../components/ui/PageLoader';
import { LoginPage } from '../features/auth/LoginPage';
import { useFlatMenusQuery, hasMenuPermission, normalizeMenuUrl } from '../hooks/useFlatMenusQuery';
import { getFirstMenuPath } from '../utils/helpers';

const Page404 = lazy(() => import('../features/errors/Page404').then((m) => ({ default: m.Page404 })));
const Page403 = lazy(() => import('../features/errors/Page403').then((m) => ({ default: m.Page403 })));
const ComingSoon = lazy(() => import('../features/common/ComingSoon'));
const MainLayout = lazy(() => import('../layouts/MainLayout').then((m) => ({ default: m.MainLayout })));
const DashboardFeature = lazy(() => import('../features/dashboard/DashboardLayout').then((m) => ({ default: m.DashboardFeature })));
const PublicScheduleActionPage = lazy(() => import('../features/public/PublicScheduleActionPage').then((m) => ({ default: m.PublicScheduleActionPage })));
const DashboardHome = lazy(() => import('../features/dashboard/DashboardHome'));
const WorkScheduleLayout = lazy(() => import('../features/work-schedule/WorkScheduleLayout'));
const Overview = lazy(() => import('../features/work-schedule/TongHop/Overview'));
const PersonalSchedule = lazy(() => import('../features/work-schedule/LichCaNhan/PersonalSchedule'));
const LeadershipScheduleRegistration = lazy(() => import('../features/work-schedule/DangKyLichLanhDao/LeadershipScheduleRegistration'));
const ScheduleApproval = lazy(() => import('../features/work-schedule/PheDuyetLich/ScheduleApproval'));
const MeetingInvitations = lazy(() => import('../features/work-schedule/LichMoiThamDu/MeetingInvitations'));
const Employee = lazy(() => import('../features/system/employee/Employee'));
const Role = lazy(() => import('../features/system/role/Role'));
const Delegation = lazy(() => import('../features/system/delegation/Delegation'));
const Permission = lazy(() => import('../features/system/permission/Permission'));
const NotificationTemplate = lazy(() => import('../features/system/notification-template/NotificationTemplate'));
const MenuManagement = lazy(() => import('../features/system/menu/Menu'));
const UserProfile = lazy(() => import('../features/system/user-profile/UserProfile').then((m) => ({ default: m.UserProfile })));
const DepartmentCategory = lazy(() => import('../features/categories/department/Department'));
const MeetingTypeCategory = lazy(() => import('../features/categories/meeting-type/MeetingType'));

const COMING_SOON_ROUTES: { path: string; titleKey: string; icon: LucideIcon }[] = [
  { path: 'tai-nguyen', titleKey: 'nav_resources', icon: Archive },
  { path: 'cong-viec', titleKey: 'nav_tasks', icon: CheckSquare },
  { path: 'bao-cao', titleKey: 'nav_reports', icon: BarChart3 },
  { path: 'thong-bao', titleKey: 'nav_notifications', icon: Bell },
];

const ComingSoonRoute: React.FC<{ titleKey: string; icon: LucideIcon }> = ({ titleKey, icon }) => {
  const { t } = useTranslation();
  return <ComingSoon title={t(titleKey)} icon={icon} />;
};

const RouteFallback: React.FC = () => <PageLoader fullScreen />;

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore(
    useShallow((s) => ({ isAuthenticated: s.isAuthenticated, isLoading: s.isLoading }))
  );

  if (isLoading) {
    return <PageLoader fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackPath?: string;
}

const UNGUARDED_PATHS = new Set(['/profile', ...COMING_SOON_ROUTES.map((r) => `/${r.path}`)]);

const MENU_PATH_ALIASES: Record<string, string[]> = {
  '/': ['/dashboard'],
  '/danh-sach-uy-quyen': ['/he-thong/uy-quyen'],
};

const canAccessPath = (menuList: any[], pathname: string): boolean => {
  const path = normalizeMenuUrl(pathname) || '/';
  if (UNGUARDED_PATHS.has(path)) return true;

  const candidates = [path, ...(MENU_PATH_ALIASES[path] ?? [])];
  if (candidates.some((p) => hasMenuPermission(menuList, p))) return true;

  return path !== '/' && menuList.some((m) => m?.isActive !== false && normalizeMenuUrl(m?.url).startsWith(`${path}/`));
};

export const MenuGuardedLayout: React.FC = () => {
  const { data: menuList = [], isLoading } = useFlatMenusQuery();
  const { pathname } = useLocation();

  if (isLoading) {
    return <PageLoader fullScreen />;
  }

  if (!canAccessPath(menuList, pathname)) {
    const firstPath = pathname === '/' ? getFirstMenuPath(menuList) : null;
    return <Navigate to={firstPath && firstPath !== '/' ? firstPath : '/403'} replace />;
  }

  return (
    <MainLayout>
      <DashboardFeature />
    </MainLayout>
  );
};

export const HomeRedirect: React.FC = () => {
  return <Navigate to="/lich-lam-viec/tong-hop" replace />;
};

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallbackPath = '/unauthorized',
}) => {
  const user = useAuthStore((s) => s.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};


export const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/leader-approval-action" element={<PublicScheduleActionPage kind="leader" />} />
        <Route path="/invitation-schedule-action" element={<PublicScheduleActionPage kind="invitation" />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MenuGuardedLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="he-thong/vai-tro" element={<Role />} />
          <Route path="he-thong/phan-quyen" element={<Permission />} />

          <Route path="he-thong/nhan-vien" element={<Employee />} />
          <Route path="danh-sach-uy-quyen" element={<Delegation />} />
          <Route path="he-thong/cau-hinh-menu" element={<MenuManagement />} />
          <Route path="he-thong/cau-hinh-mail" element={<NotificationTemplate />} />
          <Route path="profile" element={<UserProfile />} />

          <Route path="danh-muc">
            <Route index element={<Navigate to="/danh-muc/don-vi-phong-ban" replace />} />
            <Route path="don-vi-phong-ban" element={<DepartmentCategory />} />
            <Route path="loai-lich-hop" element={<MeetingTypeCategory />} />
          </Route>

          <Route path="lich-lam-viec" element={<WorkScheduleLayout />}>
            <Route index element={<Navigate to="/lich-lam-viec/tong-hop" replace />} />
            <Route path="tong-hop" element={<Overview />} />
            <Route path="ca-nhan" element={<PersonalSchedule />} />
            <Route path="dang-ky-lich-lanh-dao" element={<LeadershipScheduleRegistration />} />
            <Route path="phe-duyet" element={<ScheduleApproval />} />
            <Route path="loi-moi-tham-du" element={<MeetingInvitations />} />
          </Route>

          {COMING_SOON_ROUTES.map(({ path, titleKey, icon }) => (
            <Route key={path} path={path} element={<ComingSoonRoute titleKey={titleKey} icon={icon} />} />
          ))}
        </Route>

        <Route
          path="/unauthorized"
          element={
            <ProtectedRoute>
              <Page403 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/403"
          element={
            <ProtectedRoute>
              <Page403 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/404"
          element={
            <ProtectedRoute>
              <Page404 />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Page404 />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
};
export default AppRouter;

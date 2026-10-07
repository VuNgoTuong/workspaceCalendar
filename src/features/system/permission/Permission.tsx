import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Table, Button, Checkbox, Spin, Empty, Tooltip } from 'antd';
import {
  Save,
  RotateCcw,
  CheckSquare,
  ShieldCheck,
  Building2,
  LayoutGrid,
  ListTree,
  Package,
  Users,
  Handshake,
  ArrowRightLeft,
  Settings2,
  Layers,
  Crown,
  BedDouble,
  UserRound,
  ChevronRight,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { usePermission } from './hooks/usePermission';
import type { RoleItem } from './hooks/usePermission';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { TreeTable } from '../../../components/ui/TreeTable';
import type { TreeTableColumn, LoadChildrenResult } from '../../../components/ui/TreeTable';
import { useDepartmentsQuery, fetchDepartmentChildren } from '../../categories/department/hooks/useDepartmentQueries';
import type { IDepartment } from '../../../services/api/departmentAPI';
import { useMenusQuery } from '../menu/hooks/useMenuQueries';
import type { MenuItem } from '../types';
import { useDeptPermissionCascade } from '../../../hooks/useDeptPermissionCascade';

const DEPARTMENT_PAGE_SIZE = 20;

const ROLE_COLOR_THEMES = [
  {
    gradient: 'from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700',
    light: 'bg-blue-50/60 dark:bg-blue-950/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100/50 dark:border-blue-900/20',
    activeBorder: 'border-blue-500 dark:border-blue-500',
    activeText: 'text-blue-700 dark:text-blue-300',
    glow: 'shadow-blue-500/10 dark:shadow-blue-500/5',
    activeGlow: 'shadow-blue-500/20 dark:shadow-blue-500/10',
    bullet: 'bg-blue-500',
  },
  {
    gradient: 'from-violet-500 to-fuchsia-600 dark:from-violet-600 dark:to-fuchsia-700',
    light: 'bg-violet-50/60 dark:bg-violet-950/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-100/50 dark:border-violet-900/20',
    activeBorder: 'border-violet-500 dark:border-violet-500',
    activeText: 'text-violet-700 dark:text-violet-300',
    glow: 'shadow-violet-500/10 dark:shadow-violet-500/5',
    activeGlow: 'shadow-violet-500/20 dark:shadow-violet-500/10',
    bullet: 'bg-violet-500',
  },
  {
    gradient: 'from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700',
    light: 'bg-emerald-50/60 dark:bg-emerald-950/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100/50 dark:border-emerald-900/20',
    activeBorder: 'border-emerald-500 dark:border-emerald-500',
    activeText: 'text-[#00529C] dark:text-blue-400',
    glow: 'shadow-emerald-500/10 dark:shadow-emerald-500/5',
    activeGlow: 'shadow-emerald-500/20 dark:shadow-emerald-500/10',
    bullet: 'bg-emerald-500',
  },
  {
    gradient: 'from-orange-500 to-amber-600 dark:from-orange-600 dark:to-amber-700',
    light: 'bg-orange-50/60 dark:bg-orange-950/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-100/50 dark:border-orange-900/20',
    activeBorder: 'border-orange-500 dark:border-orange-500',
    activeText: 'text-orange-700 dark:text-orange-300',
    glow: 'shadow-orange-500/10 dark:shadow-orange-500/5',
    activeGlow: 'shadow-orange-500/20 dark:shadow-orange-500/10',
    bullet: 'bg-orange-500',
  },
  {
    gradient: 'from-pink-500 to-rose-600 dark:from-pink-600 dark:to-rose-700',
    light: 'bg-pink-50/60 dark:bg-pink-950/20',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-100/50 dark:border-pink-900/20',
    activeBorder: 'border-pink-500 dark:border-pink-500',
    activeText: 'text-pink-700 dark:text-pink-300',
    glow: 'shadow-pink-500/10 dark:shadow-pink-500/5',
    activeGlow: 'shadow-pink-500/20 dark:shadow-pink-500/10',
    bullet: 'bg-pink-500',
  },
];

interface ResourceIconConfig {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

const RESOURCE_ICON_RULES: Array<{ keywords: string[] } & ResourceIconConfig> = [
  { keywords: ['dashboard'], icon: LayoutGrid, iconBg: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  { keywords: ['department'], icon: Building2, iconBg: 'bg-cyan-50 dark:bg-cyan-950/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
  { keywords: ['user'], icon: Users, iconBg: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600 dark:text-violet-400' },
  { keywords: ['menu'], icon: ListTree, iconBg: 'bg-indigo-50 dark:bg-indigo-950/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
  { keywords: ['permission'], icon: ShieldCheck, iconBg: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  { keywords: ['notification'], icon: Package, iconBg: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  { keywords: ['delegation'], icon: Handshake, iconBg: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  { keywords: ['schedule'], icon: ArrowRightLeft, iconBg: 'bg-rose-50 dark:bg-rose-950/30', iconColor: 'text-rose-600 dark:text-rose-400' },
  { keywords: ['config', 'setting'], icon: Settings2, iconBg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-500 dark:text-slate-400' },
];

const DEFAULT_RESOURCE_ICON: ResourceIconConfig = {
  icon: Layers,
  iconBg: 'bg-slate-100 dark:bg-slate-800',
  iconColor: 'text-slate-500 dark:text-slate-400',
};

const getResourceIconConfig = (name: string): ResourceIconConfig => {
  const lower = (name || '').toLowerCase();
  const match = RESOURCE_ICON_RULES.find((rule) => rule.keywords.some((kw) => lower.includes(kw)));
  return match || DEFAULT_RESOURCE_ICON;
};

const HIDDEN_RESOURCE_NAMES = new Set(['schedule']);

const translateResourceName = (t: TFunction, name: string) => {
  const key = (name || '').toLowerCase().replace(/[\s_]+/g, '');
  return t(`permission.resources.${key}`, { defaultValue: formatPermissionName(name) });
};

const translatePermissionDef = (t: TFunction, name: string) => {
  const key = (name || '').toLowerCase().replace(/[\s_]+/g, '');
  return t(`permission.defs.${key}`, { defaultValue: formatPermissionName(name) });
};

const ROLE_ICON_KEYWORDS: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['admin'], icon: Crown },
  { keywords: ['lễ tân', 'letan', 'reception'], icon: BedDouble },
];

const DEFAULT_ROLE_ICON: LucideIcon = UserRound;

const hashRoleId = (id: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash);
};

const getRoleIcon = (role: RoleItem): LucideIcon => {
  const lower = (role.name || '').toLowerCase();
  const match = ROLE_ICON_KEYWORDS.find((rule) => rule.keywords.some((kw) => lower.includes(kw)));
  return match ? match.icon : DEFAULT_ROLE_ICON;
};

const getRoleColor = (role: RoleItem) => ROLE_COLOR_THEMES[hashRoleId(role.id) % ROLE_COLOR_THEMES.length];

const formatPermissionName = (name: string) => {
  if (!name) return '';
  return name
    .split(/[\s_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const Permission: React.FC = () => {
  const {
    metadata,
    definitions,
    metaLoading,
    roles,
    rolesLoading,
    roleGrantedCounts,
    selectedRoleId,
    setSelectedRoleId,
    activeTab,
    setActiveTab,
    deptPermMap,
    initialDeptPermMap,
    handleToggleDeptAssigned,
    menuPermMap,
    handleToggleMenuAssigned,
    matrix,
    matrixLoading,
    hasChanges,
    saving,
    handleToggle,
    handleToggleRow,
    handleSave,
    handleCancel,
    handleSelectAll,
  } = usePermission();
  const { t } = useTranslation();

  const [deptPage, setDeptPage] = useState(1);
  const [deptPageSize, setDeptPageSize] = useState(DEPARTMENT_PAGE_SIZE);
  const departmentsParams = useMemo(
    () => ({ PageNumber: deptPage, PageSize: deptPageSize, level: 1, isActive: true }),
    [deptPage, deptPageSize]
  );
  const { data: departmentsData, isLoading: departmentsLoading } = useDepartmentsQuery(departmentsParams);
  const loadDeptChildren = useCallback(
    (parentId: string | number, _record: IDepartment, page: number) => fetchDepartmentChildren(parentId, page, true),
    []
  );

  const {
    registerRecords: registerDeptRecords,
    registerChildren: registerDeptChildren,
    getState: getDeptCascadeState,
  } = useDeptPermissionCascade(deptPermMap, initialDeptPermMap);
  useEffect(() => {
    registerDeptRecords(departmentsData?.items || []);
  }, [departmentsData?.items, registerDeptRecords]);

  const { data: menus = [], isLoading: menusLoading } = useMenusQuery();
  const loadMenuChildren = useCallback(
    async (_parentId: string | number, record: MenuItem): Promise<LoadChildrenResult<MenuItem>> => ({
      items: record.children ?? [],
      hasMore: false,
    }),
    []
  );

  const resourceTypes = useMemo(
    () => (metadata?.resourceTypes || []).filter((rt) => !HIDDEN_RESOURCE_NAMES.has(rt.name?.toLowerCase())),
    [metadata]
  );

  const allMask = useMemo(
    () => definitions.reduce((acc, def) => acc | def.value, 0),
    [definitions]
  );

  const departmentColumns: TreeTableColumn<IDepartment>[] = useMemo(() => [
    {
      key: 'name',
      title: t('permission.department_name_col'),
      isTreeColumn: true,
      render: (_v, record) => (
        <div>
          <div className="text-13 font-medium text-slate-700 dark:text-slate-200">{record.name}</div>
          <div className="mt-0.5 text-11.5 font-medium tracking-tight text-slate-500 dark:text-slate-500">{record.code}</div>
        </div>
      ),
    },
    {
      key: 'assigned',
      title: t('permission.department_assigned_col'),
      align: 'center' as const,
      width: 140,
      render: (_v, record) => {
        const { checked, locked } = getDeptCascadeState(record.id);
        const checkbox = (
          <Checkbox
            checked={checked}
            disabled={matrixLoading || !selectedRoleId || locked}
            onChange={(e) => handleToggleDeptAssigned(record.id, e.target.checked)}
          />
        );
        return locked ? (
          <Tooltip title={t('permission.department_locked_tooltip', 'Đã tự động chọn theo đơn vị cha, lưu thay đổi để chỉnh riêng từng đơn vị con')}>
            {checkbox}
          </Tooltip>
        ) : checkbox;
      },
    },
  ], [t, matrixLoading, selectedRoleId, handleToggleDeptAssigned, getDeptCascadeState]);

  const menuColumns: TreeTableColumn<MenuItem>[] = useMemo(() => [
    {
      key: 'name',
      title: t('permission.menu_name_col'),
      isTreeColumn: true,
      render: (_v, record) => (
        <div className="text-13 font-medium text-slate-700 dark:text-slate-200">{record.name}</div>
      ),
    },
    {
      key: 'assigned',
      title: t('permission.menu_assigned_col'),
      align: 'center' as const,
      width: 140,
      render: (_v, record) => (
        <Checkbox
          checked={!!menuPermMap[record.id]?.assigned}
          disabled={matrixLoading || !selectedRoleId}
          onChange={(e) => handleToggleMenuAssigned(record, e.target.checked)}
        />
      ),
    },
  ], [t, matrixLoading, selectedRoleId, handleToggleMenuAssigned, menuPermMap]);

  const getMenuIsLeaf = useCallback(
    (record: MenuItem) => !record.children || record.children.length === 0,
    []
  );

  const dataSource = useMemo(
    () => resourceTypes.map((rt) => ({ ...rt, mask: matrix[rt.value] || 0 })),
    [resourceTypes, matrix]
  );

  type RowRecord = { value: number; name: string; mask: number };

  const columns = useMemo(() => [
    {
      title: t('permission.stt'),
      key: 'stt',
      width: 64,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="text-slate-600 dark:text-slate-200">{index + 1}</span>
      ),
    },
    {
      title: t('permission.resource'),
      key: 'name',
      width: 240,
      shouldCellUpdate: () => false,
      render: (_: any, rt: RowRecord) => {
        const { icon: Icon, iconBg, iconColor } = getResourceIconConfig(rt.name);
        return (
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
              <Icon size={15} />
            </div>
            <span className="font-medium text-slate-600 dark:text-slate-200">{translateResourceName(t, rt.name)}</span>
          </div>
        );
      },
    },
    {
      title: t('permission.select_all'),
      key: 'all',
      align: 'center' as const,
      width: 200,
      render: (_: any, rt: RowRecord) => {
        const currentMask = rt.mask;
        const isAllChecked = (currentMask & allMask) === allMask;
        const isIndeterminate = currentMask > 0 && !isAllChecked;
        return (
          <Checkbox
            checked={isAllChecked}
            indeterminate={isIndeterminate}
            disabled={matrixLoading || !selectedRoleId}
            onChange={() => {
              if (isAllChecked) {
                handleToggleRow(rt.value, 0);
              } else {
                handleToggleRow(rt.value, allMask);
              }
            }}
          />
        );
      },
    },
    ...definitions.map((def) => ({
      title: translatePermissionDef(t, def.name),
      key: `def_${def.value}`,
      align: 'center' as const,
      render: (_: any, rt: RowRecord) => {
        const isChecked = (rt.mask & def.value) === def.value;
        return (
          <Checkbox
            checked={isChecked}
            disabled={matrixLoading || !selectedRoleId}
            onChange={() => handleToggle(rt.value, def.value)}
          />
        );
      },
    })),
  ], [t, allMask, definitions, matrixLoading, selectedRoleId, handleToggle, handleToggleRow]);

  if (metaLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fadeIn gap-4">

      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} className="text-[#00529C] dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              {t('permission.title')}
            </h2>
            <p className="text-11.5 text-slate-500 dark:text-slate-400">
              {t('permission.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="default"
            icon={<RotateCcw size={15} />}
            onClick={handleCancel}
            disabled={!hasChanges || !selectedRoleId}
            className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t('permission.cancel_changes') || 'Hủy thay đổi'}
          </Button>
          <Button
            type="primary"
            icon={<Save size={15} />}
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges || !selectedRoleId}
            className="flex items-center gap-2 h-[38px] px-4.5 text-[13px] font-medium rounded-full"
          >
            {saving ? t('permission.saving') : t('permission.save_changes')}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">

        <div className="w-64 flex-shrink-0 flex flex-col gap-2.5 overflow-y-auto px-1.5 py-1 pr-2">
          <div className="flex items-center justify-between px-1.5 mb-1">
            <p className="font-medium text-13 tracking-wider text-slate-600 dark:text-slate-500">
              {t('permission.role')}
            </p>
            {roles.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200/40 dark:border-slate-700/40">
                {roles.length}
              </span>
            )}
          </div>

          {roles.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-10 flex-1">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span className="text-xs text-slate-400">{t('permission.no_role')}</span>}
              />
            </div>
          ) : (
            roles.map((role) => {
              const isActive = selectedRoleId === role.id;
              const color = getRoleColor(role);
              const RoleIcon = getRoleIcon(role);
              const grantedCountForRole = roleGrantedCounts[role.id];

              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`
                    w-full text-left rounded-2xl px-3.5 py-3.5 flex items-center gap-3.5
                    transition-all duration-300 border relative group cursor-pointer
                    ${isActive
                      ? `bg-white dark:bg-slate-900 ${color.activeBorder} ${color.activeGlow} shadow-lg shadow-slate-100 dark:shadow-none scale-[1.02] z-10`
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-md hover:scale-[1.01]'
                    }
                  `}
                >
                  {/* Gentle background accent for active state */}
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${color.gradient} opacity-[0.02] rounded-2xl pointer-events-none`} />
                  )}

                  {/* Icon Avatar */}
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300
                    ${isActive ? `bg-gradient-to-br ${color.gradient} text-white` : `${color.light} ${color.text}`}
                  `}>
                    <RoleIcon size={18} />
                  </div>

                  {/* Name + granted count */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate transition-colors duration-300 ${
                      isActive ? `${color.activeText}` : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {role.name}
                    </p>
                    {grantedCountForRole !== undefined && (
                      <p className="text-11.5 text-slate-400 dark:text-slate-500 mt-0.5">
                        {t('permission.granted_count', { count: grantedCountForRole })}
                      </p>
                    )}
                  </div>

                  {isActive && (
                    <ChevronRight size={16} className={`flex-shrink-0 ${color.activeText}`} />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Right: Permission */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col min-w-0">
          {!selectedRoleId ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20 bg-slate-50/10 dark:bg-slate-900/10">
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {t('permission.no_role_selected')}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {t('permission.select_role_instruction')}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 pt-3.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {(
                    [
                      { key: 'function' as const, icon: LayoutGrid, label: t('permission.tab_function') },
                      { key: 'department' as const, icon: Building2, label: t('permission.tab_department') },
                      { key: 'menu' as const, icon: ListTree, label: t('permission.tab_menu') },
                    ]
                  ).map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 shrink-0 whitespace-nowrap px-4 py-2 text-sm font-normal rounded-full border cursor-pointer transition-all duration-200 select-none ${
                          isActive
                            ? 'bg-blue-50/70 dark:bg-blue-950/20 border-[#00529C]/30 dark:border-blue-400/30 text-[#00529C] dark:text-blue-400 shadow-[0_1px_3px_rgba(0,82,156,0.05)]'
                            : 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 hover:-translate-y-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:hover:text-slate-200 hover:shadow-[0_4px_10px_-4px_rgba(15,23,42,0.05)]'
                        }`}
                      >
                        <tab.icon size={16} className="shrink-0" />
                        <span>{tab.label}</span>
                        {isActive && (
                          <span className="w-4 h-4 rounded-full bg-[#00529C] dark:bg-blue-500 text-white flex items-center justify-center shrink-0 ml-0.5 shadow-sm animate-scale-up">
                            <Check size={9.5} strokeWidth={4.5} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {hasChanges && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-11 font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      {t('permission.unsaved')}
                    </span>
                  )}
                  {activeTab === 'function' && definitions.length > 0 && (
                    <>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Checkbox checked disabled />
                          {t('permission.has_permission')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Checkbox checked={false} disabled />
                          {t('permission.no_permission')}
                        </span>
                      </div>
                      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                      <Button
                        type="text"
                        size="small"
                        icon={<CheckSquare size={13} className="text-blue-600 dark:text-blue-400" />}
                        onClick={handleSelectAll}
                        disabled={matrixLoading}
                        className="flex items-center gap-1 text-xs font-semibold text-[#00529C] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg px-2 py-1 h-auto"
                      >
                        {t('permission.select_all_btn') || 'Chọn tất cả'}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto relative p-0">
                {activeTab === 'function' ? (
                  <div className="p-5">
                    <Spin spinning={matrixLoading} size="large">
                      {resourceTypes.length === 0 ? (
                        <div className="flex items-center justify-center h-full py-24">
                          <Empty
                            description={
                              <span className="text-sm text-slate-400">
                                {t('permission.no_resource_data')}
                              </span>
                            }
                          />
                        </div>
                      ) : (
                        <div className="w-full overflow-hidden border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                          <Table
                            dataSource={dataSource}
                            columns={columns}
                            rowKey="value"
                            pagination={false}
                            size="middle"
                            className="custom-table tree-style-table"
                            scroll={{ x: 'max-content' }}
                            sticky
                          />
                        </div>
                      )}
                    </Spin>
                  </div>
                ) : activeTab === 'department' ? (
                  <div className="p-5">
                    <TreeTable
                      columns={departmentColumns}
                      dataSource={departmentsData?.items || []}
                      rowKey="id"
                      loading={departmentsLoading || matrixLoading}
                      loadChildren={loadDeptChildren}
                      onChildrenLoaded={registerDeptChildren}
                      pagination={{
                        current: deptPage,
                        pageSize: deptPageSize,
                        total: departmentsData?.totalCount || 0,
                        onChange: (page, size) => {
                          if (size !== deptPageSize) {
                            setDeptPageSize(size);
                            setDeptPage(1);
                          } else {
                            setDeptPage(page);
                          }
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="p-5">
                    <TreeTable
                      columns={menuColumns}
                      dataSource={menus}
                      rowKey="id"
                      loading={menusLoading || matrixLoading}
                      loadChildren={loadMenuChildren}
                      getIsLeaf={getMenuIsLeaf}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Permission;

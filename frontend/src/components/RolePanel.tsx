import { useState, useEffect } from 'react';
import { ROLES, type RoleId } from '../constants/roles';
import RolePanelContent from './RolePanelContent';
import type { RouteInfo } from '../hooks/useRouting';

interface RolePanelProps {
  role: RoleId;
  data: any;
  onRefresh: () => void;
  currentPoint?: [number, number] | null;
  onFindNearest?: (type: string) => void;
  routeInfo?: RouteInfo | null;
  routeStatus?: string;
  routeColor?: string;
  hasStartPoint?: boolean;
  onZoneClick?: (lat: number, lng: number) => void;
  barricadeMode?: boolean;
  onToggleBarricade?: () => void;
  onDeleteBarricade?: (id: string) => void;
}

export default function RolePanel({
  role, data, onRefresh,
  currentPoint, onFindNearest, routeInfo, routeStatus, routeColor, hasStartPoint,
  onZoneClick,
  barricadeMode, onToggleBarricade, onDeleteBarricade,
}: RolePanelProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const cfg = ROLES[role];

  useEffect(() => { setCurrentTab(0); }, [role]);

  const tabs = cfg.tabs;
  const activeTab = currentTab >= tabs.length ? 0 : currentTab;

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        className="cf-rpanel-toggle"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Show panel' : 'Hide panel'}
        style={{ borderColor: cfg.color, color: collapsed ? cfg.color : undefined }}
      >
        {collapsed ? `◀ ${cfg.icon}` : '▶'}
      </button>

      {!collapsed && (
        <div className="cf-rpanel">
          <div className="cf-rp-header">
            <div className="cf-rp-role-name" style={{ color: cfg.color }}>
              <span style={{ fontSize: 15 }}>{cfg.icon}</span>
              {cfg.label}
            </div>
            <div className="cf-rp-sub">{cfg.sub}</div>
          </div>

          <div className="cf-ptabs">
            {tabs.map((t, i) => (
              <div
                key={t}
                className={`cf-ptab ${i === activeTab ? 'active' : ''}`}
                style={i === activeTab ? { color: cfg.color, borderBottomColor: cfg.color } : {}}
                onClick={() => setCurrentTab(i)}
              >
                {t}
              </div>
            ))}
          </div>

          <div className="cf-pbody">
            <RolePanelContent
              role={role}
              tab={tabs[activeTab]}
              data={data}
              onRefresh={onRefresh}
              currentPoint={currentPoint}
              onFindNearest={onFindNearest}
              routeInfo={routeInfo}
              routeStatus={routeStatus}
              routeColor={routeColor}
              hasStartPoint={hasStartPoint}
              onZoneClick={onZoneClick}
              barricadeMode={barricadeMode}
              onToggleBarricade={onToggleBarricade}
              onDeleteBarricade={onDeleteBarricade}
            />
          </div>
        </div>
      )}
    </>
  );
}

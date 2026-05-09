import { useState, useEffect, useRef } from 'react';
import { ROLES, ROLE_IDS, type RoleId, type RoleConfig } from '../constants/roles';

interface TopbarProps {
  currentRole: RoleId;
  onRoleChange: (role: RoleId) => void;
  intensity?: number;
  simulationActive?: boolean;
}

export default function Topbar({ currentRole, onRoleChange, intensity = 0, simulationActive = false }: TopbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [clock, setClock] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const role: RoleConfig = ROLES[currentRole];

  const isFloodAlert = intensity > 0.05 && simulationActive;

  // Clock
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
        }) + ' IST'
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="cf-topbar">
      {/* Logo */}
      <div className="cf-logo">
        <div className="cf-logo-mark" style={{ background: role.color }}>
          CF
        </div>
        <span className="cf-logo-text">CrisisFlow</span>
      </div>

      <div className="cf-sep" />

      {/* Role Switcher */}
      <div className="cf-role-switcher" ref={dropdownRef}>
        <button
          className="cf-role-btn"
          style={{ borderColor: role.border, background: role.bg, color: role.color }}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <span className="cf-role-dot" style={{ background: role.color }} />
          <span>{role.label}</span>
          <span style={{ fontSize: 11, opacity: 0.6 }}>▾</span>
        </button>

        {dropdownOpen && (
          <div className="cf-role-dropdown">
            {ROLE_IDS.map((rid) => {
              const r = ROLES[rid];
              return (
                <div
                  key={rid}
                  className={`cf-role-option ${currentRole === rid ? 'active' : ''}`}
                  onClick={() => {
                    onRoleChange(rid);
                    setDropdownOpen(false);
                  }}
                >
                  <div
                    className="cf-role-icon"
                    style={{ background: r.bg, color: r.color }}
                  >
                    {r.icon}
                  </div>
                  <div>
                    <div className="cf-role-name">{rid === 'gov' ? 'Government' : rid === 'fire' ? 'Fire Station' : rid.charAt(0).toUpperCase() + rid.slice(1)}</div>
                    <div className="cf-role-sub">{r.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="cf-sep" />

      <span className="cf-forecast-label">
        KC Valley · {simulationActive ? `Storm ${(intensity * 100).toFixed(0)}%` : 'Standby'}
      </span>

      <div className="cf-pill cf-pill-live">
        <span className="cf-pulse-dot cf-pd-green" />
        LIVE
      </div>
      {isFloodAlert && (
        <div className="cf-pill cf-pill-alert">
          <span className="cf-pulse-dot cf-pd-red" />
          FLOOD ALERT
        </div>
      )}

      {/* Right side */}
      <div className="cf-topbar-right">
        <span className="cf-tb-time">{clock}</span>
        <div
          className="cf-tb-avatar"
          style={{ background: role.bg, color: role.color }}
        >
          {role.avatar}
        </div>
      </div>
    </div>
  );
}

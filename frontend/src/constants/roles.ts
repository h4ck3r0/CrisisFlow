/** Role configuration ported from dashboard.js */

export type RoleId = 'gov' | 'police' | 'hospital' | 'fire' | 'citizen';

export interface RoleConfig {
  label: string;
  sub: string;
  icon: string;       // emoji for simple rendering
  color: string;
  bg: string;
  border: string;
  avatar: string;
  tabs: string[];
  apiRole: string;     // maps to /api/dashboard/{apiRole}
}

export const ROLES: Record<RoleId, RoleConfig> = {
  gov: {
    label: 'Government · BBMP',
    sub: 'Control room · Full access',
    icon: '🏛',
    color: '#3b7bff',
    bg: '#0d1f42',
    border: '#1a3a73',
    avatar: 'GV',
    tabs: ['Overview', 'Reports', 'Resources', 'Triage'],
    apiRole: 'government',
  },
  police: {
    label: 'Police Control',
    sub: 'Traffic & evacuation',
    icon: '🛡',
    color: '#22c55e',
    bg: '#0d2a1a',
    border: '#14532d',
    avatar: 'PD',
    tabs: ['Zones', 'Road Blocks', 'Incidents', 'Alerts', 'Reports'],
    apiRole: 'police',
  },
  hospital: {
    label: 'Hospital Network',
    sub: 'Victoria & Wockhardt',
    icon: '🏥',
    color: '#f87171',
    bg: '#2a0d0d',
    border: '#7f1d1d',
    avatar: 'HS',
    tabs: ['Capacity', 'Fleet Management', 'Incidents', 'Reports'],
    apiRole: 'hospital',
  },
  fire: {
    label: 'Fire Station',
    sub: 'KC Valley Units',
    icon: '🔥',
    color: '#fb923c',
    bg: '#2a1200',
    border: '#7c2d12',
    avatar: 'FS',
    tabs: ['Incidents', 'Fleet & Logistics', 'Dispatches'],
    apiRole: 'fire',
  },
  citizen: {
    label: 'Citizen View',
    sub: 'Public alert dashboard',
    icon: '👤',
    color: '#a78bfa',
    bg: '#1a1040',
    border: '#4c1d95',
    avatar: 'ME',
    tabs: ['My Area', 'Find Help', 'Alerts', 'Report'],
    apiRole: 'citizen',
  },
};

export const ROLE_IDS: RoleId[] = ['gov', 'police', 'hospital', 'fire', 'citizen'];

/** Utility: risk level to color */
export function riskColor(r?: string): string {
  return (
    { critical: '#ef4444', severe: '#f97316', high: '#f59e0b', moderate: '#22c55e' }[r || ''] ||
    '#94a3b8'
  );
}

/** Utility: resource status to color */
export function statusColor(s?: string): string {
  return (
    {
      available: '#4ade80',
      deployed: '#fb923c',
      maintenance: '#94a3b8',
      offline: '#94a3b8',
      active: '#f87171',
      cleared: '#4ade80',
    }[s || ''] || '#94a3b8'
  );
}

/** Utility: time ago string */
export function ago(dt?: string): string {
  if (!dt) return '';
  // Ensure ISO strings without timezone are treated as UTC to prevent "5h ago" offset bugs
  let dStr = dt;
  if (dStr.includes('T') && !dStr.includes('Z') && !dStr.includes('+')) {
    dStr += 'Z';
  }
  const ms = Date.now() - new Date(dStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  return Math.floor(m / 60) + 'h ago';
}

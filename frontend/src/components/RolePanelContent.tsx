import { useState } from 'react';
import type { RoleId } from '../constants/roles';
import { riskColor, statusColor, ago } from '../constants/roles';
import { API_URL } from '../constants';
import type { RouteInfo } from '../hooks/useRouting';
import type { 
  DashboardData, 
  DashboardZone, 
  DashboardResource, 
  DashboardAlert, 
  DashboardDispatch, 
  DashboardReport, 
  DashboardIncident,
  TriageSession
} from '../hooks/useDashboard';

interface RolePanelContentProps {
  role: RoleId;
  tab: string;
  data: DashboardData | null;
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
  onClearRoute?: () => void;
}

/* ── Shared helpers ─────────────────────────────────────── */

function ZoneRows({ zones, onZoneClick }: { zones: DashboardZone[]; onZoneClick?: (lat: number, lng: number) => void }) {
  const maxD = Math.max(...zones.map((z) => z.depth_meters || 0), 1);
  const sorted = [...zones].sort((a, b) => (b.depth_meters || 0) - (a.depth_meters || 0));
  return (
    <>
      {sorted.map((z) => {
        const col = riskColor(z.risk_level);
        const pct = ((z.depth_meters || 0) / maxD * 100).toFixed(0);
        return (
          <div 
            className="cf-zone-row" 
            key={z.zone_id}
            onClick={() => z.lat && z.lng && onZoneClick?.(z.lat, z.lng)}
            style={{ cursor: onZoneClick ? 'pointer' : 'default' }}
          >
            <span className="cf-zr-id">{(z.zone_id || '').replace('zone-', '').toUpperCase()}</span>
            <span className="cf-zr-name">{z.ward_name}</span>
            <div className="cf-zr-bar-wrap">
              <div className="cf-zr-bar" style={{ width: `${pct}%`, background: col }} />
            </div>
            <span className="cf-zr-depth" style={{ color: col }}>{(z.depth_meters || 0).toFixed(2)}cm</span>
          </div>
        );
      })}
    </>
  );
}

function ResourceRow({ r, icon }: { r: DashboardResource; icon?: string }) {
  const sc = statusColor(r.status);
  const icons: Record<string, string> = {
    pump: '💧', rescue_boat: '🚤', ambulance: '🚑',
    fire_engine: '🚒', ndrf_team: '⛑', police_unit: '🚔',
  };
  return (
    <div className="cf-res-row">
      <div className="cf-res-icon" style={{ background: 'var(--role-bg)', color: 'var(--role-color)' }}>
        {icon || icons[r.resource_type] || '📦'}
      </div>
      <div style={{ flex: 1 }}>
        <div className="cf-res-name">{r.name}</div>
        <div className="cf-res-sub">{r.home_station}</div>
      </div>
      <span className="cf-res-status" style={{ background: sc + '18', color: sc }}>
        {(r.status || '').toUpperCase()}
      </span>
    </div>
  );
}

function AlertList({ alerts }: { alerts: DashboardAlert[] }) {
  if (!alerts || alerts.length === 0) return <div className="cf-empty">No alerts</div>;
  return (
    <>
      {alerts.map((x, i: number) => {
        const c: Record<string, string> = {
          evacuation: '#f87171', warning: '#fb923c', info: '#3b7bff', all_clear: '#4ade80',
        };
        return (
          <div className="cf-alert-item" key={i}>
            <div className="cf-alert-dot-wrap">
              <div className="cf-alert-type-dot" style={{ background: c[x.severity] || '#94a3b8' }} />
            </div>
            <div>
              <div className="cf-alert-title">{x.message || x.ward_name}</div>
              <div className="cf-alert-meta">
                {x.channel || 'system'} · {x.recipients_count || 0} rcpt · {ago(x.sent_at)}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function DispatchList({ dispatches, emptyLabel, onUpdateStatus }: { dispatches: DashboardDispatch[]; emptyLabel?: string; onUpdateStatus?: (id: string, status: string) => void }) {
  return (
    <>
      {dispatches.length > 0 ? dispatches.map((d, i: number) => (
        <div className="cf-report-card" key={i}>
          <div className="cf-rc-head">
            <span className="cf-rc-loc">{(d.resource_type || '').toUpperCase().replace(/_/g, ' ')} → {d.target_ward}</span>
            <span className="cf-rc-time">{ago(d.dispatched_at)}</span>
          </div>
          <div className="cf-rc-body">{d.reason}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span className="cf-rc-badge" style={{ background: statusColor(d.status) + '18', color: statusColor(d.status) }}>
              {(d.status || 'active').toUpperCase()}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {onUpdateStatus && d.status === 'pending' && (
                <button 
                  className="cf-btn primary" 
                  style={{ padding: '0 8px', fontSize: 10, height: 22, borderRadius: 4 }}
                  onClick={() => onUpdateStatus(d.order_id, 'deployed')}
                >
                  APPROVE
                </button>
              )}
              {onUpdateStatus && d.status === 'deployed' && (
                <button 
                  className="cf-btn" 
                  style={{ padding: '0 8px', fontSize: 10, height: 22, borderRadius: 4, background: '#3b82f618', color: '#3b82f6', border: '1px solid #3b82f633' }}
                  onClick={() => onUpdateStatus(d.order_id, 'complete')}
                >
                  COMPLETE
                </button>
              )}
            </div>
          </div>
        </div>
      )) : <div className="cf-empty">{emptyLabel || 'No active dispatches'}</div>}
    </>
  );
}

/* ── Emergency Finder (shared across roles) ───────────── */


const RISK_COLORS: Record<string, string> = {
  SAFE: '#4ade80', MODERATE: '#ffd200', HIGH: '#ff8800', CRITICAL: '#ff3366',
};

function EmergencyFinder({
  onFindNearest, routeInfo, routeStatus, routeColor, hasStartPoint,
}: {
  onFindNearest?: (type: string) => void;
  routeInfo?: RouteInfo | null;
  routeStatus?: string;
  routeColor?: string;
  hasStartPoint?: boolean;
}) {
  return (
    <>
      <div className="cf-slabel">EMERGENCY FINDER</div>
      {!hasStartPoint ? (
        <div className="cf-flood-warning" style={{ background: '#1a1040', borderColor: '#4c1d95' }}>
          <div className="cf-fw-title" style={{ color: '#a78bfa' }}>📍 Set location first</div>
          <div className="cf-fw-body" style={{ color: '#c4b5fd' }}>
            Click on the map to set your location, then find nearest facilities.
          </div>
        </div>
      ) : (
        <div className="cf-finder-grid">
          {[
            { type: 'hospital', icon: '🏥', label: 'Hospital' },
            { type: 'police', icon: '🚔', label: 'Police' },
            { type: 'fire', icon: '🚒', label: 'Fire Stn' },
            { type: 'shelter', icon: '🏠', label: 'Shelter' },
          ].map((f) => (
            <button
              key={f.type}
              className="cf-action-btn"
              style={{ justifyContent: 'center', flexDirection: 'column', alignItems: 'center', padding: '10px 8px' }}
              onClick={() => onFindNearest?.(f.type)}
            >
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <span style={{ fontSize: 10, marginTop: 2 }}>{f.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Route result */}
      {routeInfo && (
        <div className="cf-report-card" style={{ marginTop: 8 }}>
          <div className="cf-rc-head">
            <span className="cf-rc-loc" style={{ color: routeColor }}>{routeStatus}</span>
          </div>
          {routeInfo.facilityName && (
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cf-txt)', marginBottom: 6 }}>
              {routeInfo.facilityName}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
            <div>
              <div className="cf-res-sub">Distance</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cf-txt)' }}>{routeInfo.distanceKm} km</div>
            </div>
            <div>
              <div className="cf-res-sub">Max Depth</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: routeInfo.maxDepth > 30 ? '#f87171' : '#4ade80' }}>
                {routeInfo.maxDepth} cm
              </div>
            </div>
            <div>
              <div className="cf-res-sub">Risk</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: RISK_COLORS[routeInfo.riskLevel] || '#94a3b8' }}>
                {routeInfo.riskLevel}
              </div>
            </div>
          </div>
          {/* ETA */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { icon: '🚶', val: routeInfo.eta.walk, label: 'Walk' },
              { icon: '🚴', val: routeInfo.eta.bike, label: 'Bike' },
              { icon: '🚗', val: routeInfo.eta.car, label: 'Car' },
            ].map((e) => (
              <div key={e.label} className="cf-report-card" style={{
                flex: 1, textAlign: 'center', padding: '6px 4px', margin: 0,
                opacity: e.val === null ? 0.35 : 1,
              }}>
                <div style={{ fontSize: 14 }}>{e.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cf-txt)' }}>
                  {e.val !== null ? (e.val >= 60 ? `${Math.floor(e.val / 60)}h ${e.val % 60}m` : `${e.val} min`) : '—'}
                </div>
                {e.val === null && <div style={{ fontSize: 8, color: '#f87171' }}>FLOODED</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Gov Content ────────────────────────────────────────── */

function GovOverview({ data, onZoneClick }: { data: DashboardData, onZoneClick?: (lat: number, lng: number) => void }) {
  const zones = data?.zones || [];
  const dispatches = data?.active_dispatches || [];
  const summary = data?.summary || {};
  return (
    <>
      <div className="cf-slabel">SIMULATION METRICS</div>
      <div className="cf-report-card" style={{ marginBottom: 14, padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="cf-res-sub">Average Flood Depth</span>
          <span style={{ fontWeight: 600, color: 'var(--cf-txt)' }}>{(summary.average_depth || 0).toFixed(2)}cm</span>
        </div>
      </div>

      <div className="cf-slabel">ZONE SEVERITY</div>
      <ZoneRows zones={zones} onZoneClick={onZoneClick} />
      <div className="cf-slabel" style={{ marginTop: 14 }}>DISPATCHES ({dispatches.length})</div>
      <DispatchList dispatches={dispatches} />
    </>
  );
}

function CitizenReportsView({ data, onRefresh, role, onAssign }: { data: DashboardData; onRefresh?: () => void; role?: string; onAssign?: (r: DashboardReport, to: string) => void }) {
  const reports = data?.recent_reports || [];

  const handleVerify = async (reportId: string, currentStatus: boolean) => {
    try {
      await fetch(`${API_URL}/api/citizen-reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: !currentStatus }),
      });
      onRefresh?.();
    } catch (e) {
      console.error("Failed to verify", e);
    }
  };

  return (
    <>
      <div className="cf-slabel">CITIZEN REPORTS ({reports.length})</div>
      {reports.length === 0 && <div className="cf-empty">No reports</div>}
      {reports.map((r, i: number) => {
        const timeStr = r.reported_at ? new Date(r.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        return (
          <div className="cf-report-card" key={i}>
            <div className="cf-rc-head">
              <span className="cf-rc-loc">{r.ward_name}</span>
              <span className="cf-rc-time" title={r.reported_at}>{timeStr} ({ago(r.reported_at)})</span>
            </div>
            <div className="cf-rc-body">
              {r.description}
              {(r.lat || r.lng) && (
                <div style={{ marginTop: 4, fontSize: 10, color: 'var(--cf-txt3)' }}>
                  📍 {r.lat?.toFixed(4) || '--'}, {r.lng?.toFixed(4) || '--'}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
              <span className="cf-rc-badge" style={{
                background: r.verified ? '#0a2018' : '#2a0d0d',
                color: r.verified ? '#4ade80' : '#f87171',
              }}>
                {r.verified ? '✓ Verified' : '⚠ Unverified'}
              </span>
              <button
                className="cf-mini-btn"
                onClick={() => handleVerify(r.report_id, r.verified)}
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  background: 'var(--cf-bg3)',
                  border: '1px solid var(--cf-border)',
                  color: 'var(--cf-txt2)',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                {r.verified ? 'Undo' : 'Verify'}
              </button>
              {role === 'gov' && (
                <>
                  <button 
                    className="cf-mini-btn" 
                    style={{ fontSize: 9, padding: '2px 6px', color: '#22c55e', borderColor: '#22c55e44' }}
                    onClick={() => onAssign?.(r, 'police')}
                  >
                    ASSIGN POLICE
                  </button>
                  <button 
                    className="cf-mini-btn" 
                    style={{ fontSize: 9, padding: '2px 6px', color: '#f87171', borderColor: '#f8717144' }}
                    onClick={() => onAssign?.(r, 'hospital')}
                  >
                    ASSIGN HOSPITAL
                  </button>
                </>
              )}
              {r.gemini_depth_estimate != null && (
                <span className="cf-rc-depth-chip">~{(r.gemini_depth_estimate || 0).toFixed(2)}cm</span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

function GovResources({ data }: { data: DashboardData }) {
  return (
    <>
      <div className="cf-slabel">ALL RESOURCES</div>
      {(data?.resources || []).map((r, i: number) => <ResourceRow r={r} key={i} />)}
    </>
  );
}

function GovTriage({ data, onRefresh }: { data: DashboardData, onRefresh: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const sessions = data?.triage_sessions || [];

  const runTriage = async () => {
    setRunning(true); setStatus(null);
    try {
      const r = await fetch(`${API_URL}/api/triage/run`, { method: 'POST' });
      const d = await r.json();
      setStatus(`✓ ${d.session_id} · Dispatches: ${d.dispatch_count} · Pop: ${(d.population_covered || 0).toLocaleString()}`);
      onRefresh();
    } catch { setStatus('❌ Failed'); }
    finally { setRunning(false); }
  };

  const runAiCommander = async () => {
    setAiRunning(true); setStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/triage/auto-command`, { method: 'POST' });
      const d = await res.json();
      
      // Also run triage
      const res2 = await fetch(`${API_URL}/api/triage/run`, { method: 'POST' });
      const d2 = await res2.json();

      if (d.errors && d.errors.length > 0) {
        setStatus(`⚠ AI Issues: ${d.errors[0]}`);
      } else {
        setStatus(`✓ AI COMPLETE · Reports: ${d.reports_processed} · Triage: ${d2.dispatch_count} dispatches`);
      }
      onRefresh();
    } catch { setStatus('❌ AI Communication Failed'); }
    finally { setAiRunning(false); }
  };

  return (
    <>
      <div className="cf-slabel">AI COMMANDER</div>
      <button 
        className="cf-action-btn" 
        style={{ 
          background: 'linear-gradient(135deg, #1e3a8a 0%, #4338ca 100%)', 
          borderColor: '#4f46e5',
          color: '#fff',
          marginBottom: 16
        }}
        onClick={runAiCommander} 
        disabled={aiRunning || running}
      >
        <span>🧠</span>
        <div>
          <div>{aiRunning ? 'AI AGENT ACTIVE...' : 'ACTIVATE AI COMMANDER'}</div>
          <div className="cf-ab-sub" style={{ color: '#a5b4fc' }}>Auto-categorize reports & dispatch</div>
        </div>
      </button>

      <div className="cf-slabel">TRIAGE COMMANDER (FLOOD)</div>
      <button className="cf-action-btn cf-action-primary" onClick={runTriage} disabled={running || aiRunning}>
        <span>🌊</span>
        <div>
          <div>{running ? 'Running...' : 'Run Flood Triage'}</div>
          <div className="cf-ab-sub">AI dispatches to critical zones</div>
        </div>
      </button>
      {status && (
        <div className="cf-log-item" style={{ borderLeftColor: status.startsWith('✓') ? '#4ade80' : '#f87171' }}>
          <div className="cf-log-text">{status}</div>
        </div>
      )}
      
      <div className="cf-slabel" style={{ marginTop: 14 }}>RECENT TRIAGE SESSIONS</div>
      {sessions.length > 0 ? sessions.map((s: TriageSession, i: number) => (
        <div className="cf-report-card" key={i}>
          <div className="cf-rc-head">
            <span className="cf-rc-loc" style={{ color: '#a78bfa' }}>{s.session_id}</span>
            <span className="cf-rc-time">{ago(s.started_at)}</span>
          </div>
          <div className="cf-rc-body" style={{ marginTop: 4 }}>
            Status: <span style={{ color: s.status === 'complete' ? '#4ade80' : '#fb923c' }}>{s.status}</span> <br/>
            Dispatches: {s.dispatch_count} <br/>
            Pop Covered: {(s.population_covered || 0).toLocaleString()}
          </div>
        </div>
      )) : <div className="cf-empty">No previous sessions</div>}
    </>
  );
}

/* ── Police Content ─────────────────────────────────────── */

function PoliceRoadBlocks({ data, barricadeMode, onToggleBarricade, onDeleteBarricade }: { data: DashboardData, barricadeMode?: boolean, onToggleBarricade?: () => void, onDeleteBarricade?: (id: string) => void }) {
  const blocks = data?.active_road_blocks || [];
  return (
    <>
      <div className="cf-slabel">MANUAL BARRICADES</div>
      <button 
        className={`cf-action-btn ${barricadeMode ? 'active' : ''}`}
        style={{ 
          background: barricadeMode ? '#dc2626' : '#1e293b', 
          borderColor: barricadeMode ? '#ef4444' : '#334155',
          color: '#fff',
          marginBottom: 16
        }}
        onClick={onToggleBarricade}
      >
        <span>🚧</span>
        <div>
          <div>{barricadeMode ? 'CANCEL PLACEMENT' : 'PLACE MANUAL BARRICADE'}</div>
          <div className="cf-ab-sub" style={{ color: barricadeMode ? '#fecaca' : '#94a3b8' }}>
            {barricadeMode ? 'Click map to place' : 'Snap barricade to road node'}
          </div>
        </div>
      </button>

      <div className="cf-slabel">ROAD BLOCKS ({blocks.length})</div>
      {blocks.map((b, i: number) => (
        <div className="cf-res-row" key={i}>
          <div className="cf-res-icon" style={{ background: '#0d2a1a', color: '#22c55e' }}>🚧</div>
          <div style={{ flex: 1 }}>
            <div className="cf-res-name">{b.road_name}</div>
            <div className="cf-res-sub">{b.reason} · {(b.depth_at_block || 0).toFixed(2)}cm</div>
          </div>
          <button 
            className="cf-mini-btn" 
            style={{ color: '#f87171', borderColor: '#f8717144' }}
            onClick={() => onDeleteBarricade?.(b.block_id)}
          >
            REMOVE
          </button>
        </div>
      ))}
      {blocks.length === 0 && <div className="cf-empty">No road blocks</div>}
    </>
  );
}

function IncidentList({ incidents, emptyLabel, onUpdateStatus, onDeploy }: { incidents: DashboardIncident[]; emptyLabel?: string; onUpdateStatus?: (id: string, status: string) => void; onDeploy?: (inc: DashboardIncident) => void }) {
  return (
    <>
      {incidents.map((inc, i: number) => (
        <div className="cf-report-card" key={i}>
          <div className="cf-rc-head">
            <span className="cf-rc-loc">{inc.location_name || ''}</span>
            <span className="cf-rc-badge" style={{ background: statusColor(inc.status) + '18', color: statusColor(inc.status) }}>
              {(inc.status || inc.severity || 'PENDING').toUpperCase()}
            </span>
          </div>
          <div className="cf-rc-body">{(inc.incident_type || '').replace(/_/g, ' ')}</div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {onUpdateStatus && inc.status !== 'resolved' && (
              <>
                <button 
                  className="cf-mini-btn" 
                  onClick={() => onUpdateStatus(inc.incident_id, 'active')}
                  style={{ background: '#3b82f618', color: '#3b82f6' }}
                >
                  RESPOND
                </button>
                <button 
                  className="cf-mini-btn" 
                  onClick={() => onUpdateStatus(inc.incident_id, 'resolved')}
                  style={{ background: '#22c55e18', color: '#22c55e' }}
                >
                  RESOLVE
                </button>
              </>
            )}
            {onDeploy && inc.status !== 'resolved' && (
              <button 
                className="cf-mini-btn primary" 
                style={{ background: 'var(--role-color)', color: '#fff', borderColor: 'var(--role-color)' }}
                onClick={() => onDeploy(inc)}
              >
                DEPLOY UNIT
              </button>
            )}
          </div>
        </div>
      ))}
      {incidents.length === 0 && <div className="cf-empty">{emptyLabel || 'No incidents'}</div>}
    </>
  );
}

/* ── Hospital Content ───────────────────────────────────── */

function HospitalCapacity({ data }: { data: DashboardData }) {
  return (
    <>
      <div className="cf-slabel">BED AVAILABILITY</div>
      {(data?.hospitals || []).map((h, i: number) => {
        const wards = [
          { n: 'General', a: h.general_beds_available, t: h.general_beds_total },
          { n: 'ICU', a: h.icu_beds_available, t: h.icu_beds_total },
          { n: 'Emergency', a: h.emergency_beds_available, t: h.emergency_beds_total },
        ];
        return (
          <div style={{ marginBottom: 14 }} key={i}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--cf-txt)', marginBottom: 8 }}>{h.hospital_name}</div>
            {wards.map((w) => {
              const pct = w.t > 0 ? ((w.a / w.t) * 100).toFixed(0) : '0';
              const c = Number(pct) < 30 ? '#f87171' : Number(pct) < 60 ? '#fb923c' : '#4ade80';
              return (
                <div style={{ marginBottom: 6 }} key={w.n}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--cf-txt2)' }}>{w.n}</span>
                    <span style={{ fontSize: 10, fontFamily: 'var(--cf-mono)', color: c }}>{w.a}/{w.t}</span>
                  </div>
                  <div className="cf-capacity-bar">
                    <div className="cf-capacity-fill" style={{ width: `${pct}%`, background: c }} />
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 9, color: 'var(--cf-txt3)' }}>
              Blood O+: {h.blood_o_positive} · IV: {h.iv_fluids_bags} · Tetanus: {h.tetanus_doses}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ── Citizen Content ────────────────────────────────────── */

function CitizenMyArea({ data }: { data: DashboardData }) {
  const z = data?.zone || data?.zones?.[0] || {};
  const shelters = data?.evacuation_shelters || [];
  const isCritical = z.risk_level === 'critical' || z.risk_level === 'severe';
  return (
    <>
      {isCritical && (
        <div className="cf-flood-warning">
          <div className="cf-fw-title">⚠️ Flood warning</div>
          <div className="cf-fw-body">{z.ward_name || ''}: <strong>{(z.depth_meters || 0).toFixed(2)}cm</strong> depth predicted.</div>
        </div>
      )}
      <div className="cf-slabel">STATUS</div>
      {[
        { l: 'Zone', v: z.ward_name || '--', c: riskColor(z.risk_level) },
        { l: 'Depth', v: (z.depth_meters || 0).toFixed(2) + 'cm', c: riskColor(z.risk_level) },
        { l: 'Access', v: ((z.road_accessibility || 0) * 100).toFixed(0) + '%', c: '#a78bfa' },
      ].map((row) => (
        <div className="cf-status-row" key={row.l}>
          <span className="cf-status-label">{row.l}</span>
          <span className="cf-status-val" style={{ color: row.c }}>{row.v}</span>
        </div>
      ))}
      <div className="cf-slabel" style={{ marginTop: 12 }}>SHELTERS</div>
      {shelters.map((s, i: number) => (
        <div className="cf-res-row" key={i}>
          <div className="cf-res-icon" style={{ background: '#1a1040', color: '#a78bfa' }}>🏠</div>
          <div style={{ flex: 1 }}><div className="cf-res-name">{s.name}</div></div>
        </div>
      ))}
    </>
  );
}

function CitizenReportForm({ onRefresh, currentPoint }: { onRefresh: () => void; currentPoint?: [number, number] | null }) {
  const [desc, setDesc] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [reportTo] = useState('government');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill from map click
  const effectiveLat = currentPoint ? currentPoint[1].toFixed(6) : lat;
  const effectiveLng = currentPoint ? currentPoint[0].toFixed(6) : lng;

  const submit = async () => {
    if (!desc) return;
    const latVal = parseFloat(effectiveLat);
    const lngVal = parseFloat(effectiveLng);
    if (isNaN(latVal) || isNaN(lngVal)) { setStatus('❌ Set location on map or enter lat/lng'); return; }
    setSubmitting(true); setStatus(null);
    try {
      const r = await fetch(`${API_URL}/api/citizen-reports/quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, lat: latVal, lng: lngVal, report_to: reportTo }),
      });
      const j = await r.json();
      const targetLabel = reportTo.charAt(0).toUpperCase() + reportTo.slice(1);
      setStatus(`✓ ${j.report_id} sent to ${targetLabel} · Zone: ${j.zone_id}`);
      setDesc('');
      onRefresh();
    } catch { setStatus('❌ Failed to submit report'); }
    finally { setSubmitting(false); }
  };


  return (
    <>
      <div className="cf-slabel">REPORT FLOOD</div>
      {currentPoint ? (
        <div className="cf-flood-warning" style={{ background: '#0a2018', borderColor: '#14532d', marginBottom: 10 }}>
          <div className="cf-fw-title" style={{ color: '#4ade80' }}>📍 Location set from map</div>
          <div className="cf-fw-body" style={{ color: '#86efac' }}>
            {effectiveLat}, {effectiveLng}
          </div>
        </div>
      ) : (
        <div className="cf-flood-warning" style={{ background: '#1a1040', borderColor: '#4c1d95', marginBottom: 10 }}>
          <div className="cf-fw-title" style={{ color: '#a78bfa' }}>📍 Click map to set location</div>
          <div className="cf-fw-body" style={{ color: '#c4b5fd' }}>Or enter coordinates manually below.</div>
        </div>
      )}


      <textarea
        className="cf-report-textarea"
        rows={3}
        placeholder="Describe the flood situation..."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="cf-input-label">Lat</div>
          <input className="cf-input" type="number" step="0.0001" value={effectiveLat}
            onChange={(e) => setLat(e.target.value)} placeholder="12.9250" />
        </div>
        <div style={{ flex: 1 }}>
          <div className="cf-input-label">Lng</div>
          <input className="cf-input" type="number" step="0.0001" value={effectiveLng}
            onChange={(e) => setLng(e.target.value)} placeholder="77.6680" />
        </div>
      </div>
      <button className="cf-action-btn cf-action-primary" onClick={submit} disabled={submitting || !desc}>
        <span>📤</span>
        <div>{submitting ? 'Submitting...' : `Submit Report to ${reportTo.charAt(0).toUpperCase() + reportTo.slice(1)}`}</div>
      </button>
      {status && (
        <div style={{ marginTop: 8, fontSize: 11, color: status.startsWith('✓') ? '#4ade80' : '#f87171' }}>{status}</div>
      )}
    </>
  );
}

/* ── Main Renderer ──────────────────────────────────────── */

export default function RolePanelContent({
  role, tab, data, onRefresh,
  currentPoint, onFindNearest, routeInfo, routeStatus, routeColor, hasStartPoint,
  onZoneClick,
  barricadeMode, onToggleBarricade, onDeleteBarricade,
}: RolePanelContentProps) {
  if (!data) return <div className="cf-empty">Loading...</div>;

  const content = (() => {
    const zones = data.zones || [];
    const resources = data.resources || [];
    const incidents = data.active_incidents || data.fire_incidents || data.incoming_medical_incidents || [];
    const dispatches = data.active_dispatches || [];
    const alerts = data.recent_alerts || data.alerts || [];

    const handleDispatchUpdate = async (orderId: string, status: string) => {
      try {
        const res = await fetch(`${API_URL}/api/dispatches/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (res.ok) onRefresh();
      } catch (e) {
        console.error('Failed to update dispatch:', e);
      }
    };

    const handleIncidentUpdate = async (incId: string, status: string) => {
      try {
        const res = await fetch(`${API_URL}/api/incidents/${incId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (res.ok) onRefresh();
      } catch (e) {
        console.error('Failed to update incident:', e);
      }
    };

    const handleAssign = async (r: DashboardReport, to: string) => {
      try {
        const rid = r.report_id;
        const res = await fetch(`${API_URL}/api/citizen-reports/${rid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report_to: to }),
        });

        if (!res.ok) return;

        if (to === 'police') {
          await fetch(`${API_URL}/api/incidents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              incident_id: `INC-ASSIGN-${Math.random().toString(36).substring(7).toUpperCase()}`,
              incident_type: 'evacuation_support',
              zone_id: r.zone_id || 'unknown',
              location_name: r.ward_name || 'Assigned Location',
              severity: 'high',
              notes: `Assigned from Gov: ${r.description}`
            }),
          });
        } else if (to === 'hospital') {
          await fetch(`${API_URL}/api/dispatches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: `DO-ASSIGN-${Math.random().toString(36).substring(7).toUpperCase()}`,
              resource_id: 'auto',
              resource_type: 'ambulance',
              target_zone_id: r.zone_id || 'unknown',
              target_ward: r.ward_name || 'Assigned Location',
              reason: `Gov assigned medical evac: ${r.description}`,
              dispatched_by: 'government',
              status: 'pending'
            }),
          });
        }
        onRefresh();
      } catch (e) {
        console.error('Failed to assign report:', e);
      }
    };

    const handleIncidentDeploy = async (inc: DashboardIncident) => {
      try {
        await fetch(`${API_URL}/api/dispatches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: `DO-POL-${Math.random().toString(36).substring(7).toUpperCase()}`,
            resource_id: 'auto',
            resource_type: 'police_unit',
            target_zone_id: inc.zone_id || 'unknown',
            target_ward: inc.location_name || 'Unknown Ward',
            reason: `Responding to incident: ${inc.incident_id}`,
            dispatched_by: 'police',
            status: 'deployed'
          }),
        });
        await fetch(`${API_URL}/api/incidents/${inc.incident_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        });
        onRefresh();
      } catch (e) {
        console.error('Failed to deploy from incident:', e);
      }
    };



  // Government
  if (role === 'gov') {
    if (tab === 'Overview') return <GovOverview data={data} onZoneClick={onZoneClick} />;
    if (tab === 'Reports') return <CitizenReportsView data={data} onRefresh={onRefresh} role={role} onAssign={handleAssign} />;
    if (tab === 'Resources') return <GovResources data={data} />;
    if (tab === 'Triage') return <GovTriage data={data} onRefresh={onRefresh} />;
  }

  // Police
  if (role === 'police') {
    if (tab === 'Zones') return <><div className="cf-slabel">FLOOD ZONES</div><ZoneRows zones={zones} onZoneClick={onZoneClick} /></>;
    if (tab === 'Road Blocks') return <PoliceRoadBlocks data={data} barricadeMode={barricadeMode} onToggleBarricade={onToggleBarricade} onDeleteBarricade={onDeleteBarricade} />;
    if (tab === 'Incidents') return <><div className="cf-slabel">INCIDENTS</div><IncidentList incidents={incidents} onUpdateStatus={handleIncidentUpdate} onDeploy={handleIncidentDeploy} /></>;
    if (tab === 'Alerts') return <><div className="cf-slabel">ALERTS</div><AlertList alerts={alerts} /></>;
    if (tab === 'Reports') return <CitizenReportsView data={data} onRefresh={onRefresh} role={role} onAssign={handleAssign} />;
  }

  // Hospital
  if (role === 'hospital') {
    if (tab === 'Capacity') return <HospitalCapacity data={data} />;
    if (tab === 'Fleet Management') {
      const ambulances = (data.ambulances || resources).filter((r) => r.resource_type === 'ambulance');
      return (
        <>
          <div className="cf-slabel">AMBULANCE DISPATCHES</div>
          <DispatchList 
            dispatches={dispatches.filter((d) => d.resource_type === 'ambulance')} 
            onUpdateStatus={handleDispatchUpdate} 
          />
          <div className="cf-slabel" style={{ marginTop: 14 }}>FLEET STATUS</div>
          {ambulances.map((r, i: number) => <ResourceRow r={r} icon="🚑" key={i} />)}
        </>
      );
    }
    if (tab === 'Incidents') return <><div className="cf-slabel">MEDICAL</div><IncidentList incidents={incidents} emptyLabel="None" onUpdateStatus={handleIncidentUpdate} /></>;
    if (tab === 'Reports') return <CitizenReportsView data={data} onRefresh={onRefresh} role={role} />;
  }

  // Fire
  if (role === 'fire') {
    if (tab === 'Incidents') return <><div className="cf-slabel">FIRE INCIDENTS</div><IncidentList incidents={incidents} emptyLabel="None" /></>;
    if (tab === 'Resources') {
      const fireRes = data.fire_resources || resources.filter((r) => r.owner_role === 'fire');
      return <><div className="cf-slabel">FLEET</div>{fireRes.map((r, i: number) => <ResourceRow r={r} key={i} />)}</>;
    }
    if (tab === 'Dispatches') return <><div className="cf-slabel">DISPATCHES</div><DispatchList dispatches={dispatches} emptyLabel="None" onUpdateStatus={handleDispatchUpdate} /></>;
  }

    // Citizen
    if (role === 'citizen') {
      if (tab === 'My Area') return <CitizenMyArea data={data} />;
      if (tab === 'Alerts') return <><div className="cf-slabel">ALERTS</div><AlertList alerts={alerts} /></>;
      if (tab === 'Report') return <CitizenReportForm onRefresh={onRefresh} currentPoint={currentPoint} />;
      if (tab === 'Find Help') return (
        <EmergencyFinder
          onFindNearest={onFindNearest}
          routeInfo={routeInfo}
          routeStatus={routeStatus}
          routeColor={routeColor}
          hasStartPoint={hasStartPoint}
        />
      );
    }

    return null;
  })();

  return content;
}

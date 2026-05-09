import type { RouteInfo } from '../hooks/useRouting';

interface RoutingPanelProps {
  routeStatus: string;
  routeColor: string;
  showClear: boolean;
  onClearRoute: () => void;
  routeInfo: RouteInfo | null;
  onFindNearest: (type: string) => void;
  hasStartPoint: boolean;
}

const RISK_COLORS: Record<string, string> = {
  SAFE: '#4ade80',
  MODERATE: '#ffd200',
  HIGH: '#ff8800',
  CRITICAL: '#ff3366',
};

function formatETA(mins: number | null): string {
  if (mins === null) return '—';
  if (mins < 1) return '<1 min';
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins} min`;
}

export default function RoutingPanel({
  routeStatus,
  routeColor,
  showClear,
  onClearRoute,
  routeInfo,
  onFindNearest,
  hasStartPoint,
}: RoutingPanelProps) {
  return (
    <div className="routing-section">
      <h3>AI Dynamic Routing</h3>
      <p>Click two points on the map for a safe route.</p>
      <div className="route-status" style={{ color: routeColor }}>
        {routeStatus}
      </div>

      {routeInfo && (
        <>
          {/* Stats Row */}
          <div className="route-stats-row">
            <div className="route-stat-chip">
              <span className="chip-value">{routeInfo.distanceKm}</span>
              <span className="chip-label">km</span>
            </div>
            <div className="route-stat-chip">
              <span className="chip-value" style={{
                color: routeInfo.maxDepth > 5 ? '#ff3366' : routeInfo.maxDepth > 2 ? '#ff8800' : '#4ade80'
              }}>
                {routeInfo.maxDepth}
              </span>
              <span className="chip-label">cm depth</span>
            </div>
            <div className="route-stat-chip">
              <span className="chip-value" style={{ color: RISK_COLORS[routeInfo.riskLevel] }}>
                {routeInfo.riskLevel}
              </span>
              <span className="chip-label">risk</span>
            </div>
          </div>

          {routeInfo.facilityName && (
            <div className="route-destination">
              📍 {routeInfo.facilityName}
            </div>
          )}

          {/* ETA Cards */}
          <div className="eta-row">
            <div className={`eta-card ${routeInfo.eta.walk === null ? 'blocked' : ''}`}>
              <span className="eta-icon">🚶</span>
              <span className="eta-time">{formatETA(routeInfo.eta.walk)}</span>
              {routeInfo.eta.walk === null && <span className="eta-blocked">Flooded</span>}
            </div>
            <div className={`eta-card ${routeInfo.eta.bike === null ? 'blocked' : ''}`}>
              <span className="eta-icon">🚴</span>
              <span className="eta-time">{formatETA(routeInfo.eta.bike)}</span>
              {routeInfo.eta.bike === null && <span className="eta-blocked">Flooded</span>}
            </div>
            <div className={`eta-card ${routeInfo.eta.car === null ? 'blocked' : ''}`}>
              <span className="eta-icon">🚗</span>
              <span className="eta-time">{formatETA(routeInfo.eta.car)}</span>
              {routeInfo.eta.car === null && <span className="eta-blocked">Flooded</span>}
            </div>
          </div>
        </>
      )}

      {hasStartPoint && !routeInfo && (
        <div className="nearest-btns">
          <button className="nearest-btn hospital" onClick={() => onFindNearest('hospital')}>
            🏥 Nearest Hospital
          </button>
          <button className="nearest-btn police" onClick={() => onFindNearest('police')}>
            🚔 Nearest Police
          </button>
          <button className="nearest-btn shelter" onClick={() => onFindNearest('shelter')}>
            🏠 Nearest Shelter
          </button>
        </div>
      )}

      {showClear && (
        <button className="outline-btn" onClick={onClearRoute}>
          Clear Route
        </button>
      )}
    </div>
  );
}

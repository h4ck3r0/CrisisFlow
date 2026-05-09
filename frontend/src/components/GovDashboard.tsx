import type { GovStats } from '../types';

interface GovDashboardProps {
  stats: GovStats;
}

export default function GovDashboard({ stats }: GovDashboardProps) {
  return (
    <div className="gov-section">
      <h3>Government Dashboard</h3>
      <div className="gov-grid">
        <div className="gov-stat">
          <span className="gov-label">Affected Nodes</span>
          <span className="gov-value">
            {stats.total > 0
              ? `${stats.affected.toLocaleString()} / ${stats.total.toLocaleString()}`
              : '--'}
          </span>
        </div>
        <div className="gov-stat">
          <span
            className="gov-value danger"
            style={{
              color: stats.critical > 0 ? '#ff3366' : '#4ade80',
            }}
          >
            {stats.total > 0 ? stats.critical.toLocaleString() : '--'}
          </span>
          <span className="gov-label">Critical Zones</span>
        </div>
        <div className="gov-stat">
          <span className="gov-label">Max Depth</span>
          <span className="gov-value">
            {stats.total > 0 ? `${stats.maxDepth.toFixed(2)} cm` : '--'}
          </span>
        </div>
        <div className="gov-stat">
          <span
            className="gov-value warning"
            style={{
              color: stats.dangerous > 100 ? '#ff8800' : '#4ade80',
            }}
          >
            {stats.total > 0 ? stats.dangerous.toLocaleString() : '--'}
          </span>
          <span className="gov-label">High Risk</span>
        </div>
      </div>
    </div>
  );
}

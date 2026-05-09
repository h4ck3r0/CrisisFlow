import React, { useState } from 'react';
import { type NavTab } from './TopRightNav';
import type { RouteInfo } from '../hooks/useRouting';

export interface Report {
  id: string;
  type: 'police' | 'hospital';
  description: string;
  location: [number, number];
  timestamp: Date;
}

interface BottomRightPanelProps {
  activeTab: NavTab;
  onReport: (report: Omit<Report, 'id' | 'timestamp'>) => void;
  reports: Report[];
  isSettingLocation: boolean;
  onToggleSetLocation: () => void;
  currentPoint: [number, number] | null;
  onFindNearest: (type: string) => void;
  routeInfo: RouteInfo | null;
  routeStatus: string;
  routeColor: string;
  hasStartPoint: boolean;
}

const RISK_COLORS: Record<string, string> = {
  SAFE: '#4ade80',
  MODERATE: '#ffd200',
  HIGH: '#ff8800',
  CRITICAL: '#ff3366',
};

const BottomRightPanel: React.FC<BottomRightPanelProps> = ({
  activeTab,
  onReport,
  reports,
  isSettingLocation,
  onToggleSetLocation,
  currentPoint,
  onFindNearest,
  routeInfo,
  routeStatus,
  routeColor,
  hasStartPoint,
}) => {
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState<'police' | 'hospital'>('police');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPoint || !description) return;
    onReport({
      type: reportType,
      description,
      location: currentPoint,
    });
    setDescription('');
    setIsFormOpen(false);
  };

  const filteredReports = reports.filter((r) => r.type === activeTab);

  if (activeTab === 'police' || activeTab === 'hospital') {
    return (
      <div className="bottom-right-container">
        <div className="reporter-panel">
          <div className="reporter-header">
            <h3>Recent {activeTab === 'police' ? 'Police' : 'Hospital'} Reports</h3>
          </div>
          <div className="reports-view">
            {filteredReports.length === 0 ? (
              <div className="subtitle">No recent reports</div>
            ) : (
              filteredReports.map((report) => (
                <div key={report.id} className={`report-card ${report.type}`}>
                  <div className="report-card-header">
                    <span className="report-type-label">{report.type}</span>
                    <span className="report-time">
                      {report.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="report-desc">{report.description}</div>
                  <div className="report-loc">
                    Loc: {report.location[1].toFixed(4)}, {report.location[0].toFixed(4)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab !== 'user') return null;

  return (
    <div className="bottom-right-container">
      {/* Emergency Finder Section */}
      <div className="reporter-panel user-finder-panel">
        <div className="reporter-header">
          <h3>🆘 Emergency Finder</h3>
        </div>

        {!hasStartPoint ? (
          <div className="finder-hint">
            <span className="finder-hint-icon">📍</span>
            <span>Click anywhere on the map to set your location, then find the nearest facility.</span>
          </div>
        ) : (
          <>
            <div className="finder-hint active-hint">
              <span className="finder-hint-icon">✅</span>
              <span>Location set! Choose an emergency service below.</span>
            </div>

            <div className="finder-grid">
              <button className="finder-btn hospital" onClick={() => onFindNearest('hospital')}>
                <span className="finder-btn-icon">🏥</span>
                <span className="finder-btn-label">Nearest Hospital</span>
              </button>
              <button className="finder-btn police" onClick={() => onFindNearest('police')}>
                <span className="finder-btn-icon">🚔</span>
                <span className="finder-btn-label">Nearest Police</span>
              </button>
              <button className="finder-btn fire" onClick={() => onFindNearest('fire')}>
                <span className="finder-btn-icon">🚒</span>
                <span className="finder-btn-label">Nearest Fire Stn</span>
              </button>
              <button className="finder-btn shelter" onClick={() => onFindNearest('shelter')}>
                <span className="finder-btn-icon">🏠</span>
                <span className="finder-btn-label">Nearest Shelter</span>
              </button>
            </div>
          </>
        )}

        {/* Route Result */}
        {routeInfo && (
          <div className="finder-result">
            <div className="finder-result-status" style={{ color: routeColor }}>
              {routeStatus}
            </div>
            {routeInfo.facilityName && (
              <div className="finder-result-name">{routeInfo.facilityName}</div>
            )}
            <div className="finder-result-stats">
              <div className="finder-stat">
                <span className="finder-stat-label">Distance</span>
                <span className="finder-stat-value">{routeInfo.distanceKm} km</span>
              </div>
              <div className="finder-stat">
                <span className="finder-stat-label">Max Depth</span>
                <span className="finder-stat-value" style={{
                  color: routeInfo.maxDepth > 5 ? '#ff3366' : routeInfo.maxDepth > 2 ? '#ff8800' : '#4ade80'
                }}>
                  {routeInfo.maxDepth} cm
                </span>
              </div>
              <div className="finder-stat">
                <span className="finder-stat-label">Risk</span>
                <span className="finder-stat-value" style={{
                  color: RISK_COLORS[routeInfo.riskLevel] || '#8b9bb4'
                }}>
                  {routeInfo.riskLevel}
                </span>
              </div>
            </div>
            {/* ETA */}
            <div className="finder-eta-row">
              <div className={`finder-eta-card ${routeInfo.eta.walk === null ? 'blocked' : ''}`}>
                <span className="finder-eta-icon">🚶</span>
                <span className="finder-eta-time">
                  {routeInfo.eta.walk !== null ? (routeInfo.eta.walk >= 60 ? `${Math.floor(routeInfo.eta.walk / 60)}h ${routeInfo.eta.walk % 60}m` : `${routeInfo.eta.walk} min`) : '—'}
                </span>
                {routeInfo.eta.walk === null && <span className="eta-blocked">Flooded</span>}
              </div>
              <div className={`finder-eta-card ${routeInfo.eta.bike === null ? 'blocked' : ''}`}>
                <span className="finder-eta-icon">🚴</span>
                <span className="finder-eta-time">
                  {routeInfo.eta.bike !== null ? (routeInfo.eta.bike >= 60 ? `${Math.floor(routeInfo.eta.bike / 60)}h ${routeInfo.eta.bike % 60}m` : `${routeInfo.eta.bike} min`) : '—'}
                </span>
                {routeInfo.eta.bike === null && <span className="eta-blocked">Flooded</span>}
              </div>
              <div className={`finder-eta-card ${routeInfo.eta.car === null ? 'blocked' : ''}`}>
                <span className="finder-eta-icon">🚗</span>
                <span className="finder-eta-time">
                  {routeInfo.eta.car !== null ? (routeInfo.eta.car >= 60 ? `${Math.floor(routeInfo.eta.car / 60)}h ${routeInfo.eta.car % 60}m` : `${routeInfo.eta.car} min`) : '—'}
                </span>
                {routeInfo.eta.car === null && <span className="eta-blocked">Flooded</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Form */}
      {isFormOpen && (
        <div className="reporter-panel">
          <div className="reporter-header">
            <h3>New Report</h3>
            <button className="close-btn" onClick={() => setIsFormOpen(false)}>&times;</button>
          </div>
          <form className="report-form" onSubmit={handleSubmit}>
            <div className="report-type-selector">
              <button
                type="button"
                className={`type-btn ${reportType === 'police' ? 'active police' : ''}`}
                onClick={() => setReportType('police')}
              >
                Police
              </button>
              <button
                type="button"
                className={`type-btn ${reportType === 'hospital' ? 'active hospital' : ''}`}
                onClick={() => setReportType('hospital')}
              >
                Hospital
              </button>
            </div>
            <textarea
              className="report-textarea"
              placeholder="Describe the situation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            {currentPoint ? (
              <div className="location-info">
                📍 {currentPoint[1].toFixed(4)}, {currentPoint[0].toFixed(4)}
              </div>
            ) : (
              <div className="subtitle" style={{ color: 'var(--danger)' }}>
                Please set location on map first
              </div>
            )}
            <button className="glow-btn" type="submit" disabled={!currentPoint || !description}>
              Submit Report
            </button>
          </form>
        </div>
      )}

      <button
        className={`set-location-fab ${isSettingLocation ? 'active' : ''}`}
        onClick={() => {
          if (isSettingLocation) {
            onToggleSetLocation();
          } else {
            onToggleSetLocation();
            setIsFormOpen(true);
          }
        }}
      >
        {isSettingLocation ? '📍 Cancel Setting' : '📍 Set Location & Report'}
      </button>
    </div>
  );
};

export default BottomRightPanel;

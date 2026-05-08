import React, { useState } from 'react';
import { type NavTab } from './TopRightNav';

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
}

const BottomRightPanel: React.FC<BottomRightPanelProps> = ({
  activeTab,
  onReport,
  reports,
  isSettingLocation,
  onToggleSetLocation,
  currentPoint,
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

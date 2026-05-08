import GovDashboard from './GovDashboard';
import Timeline from './Timeline';
import RoutingPanel from './RoutingPanel';
import Legend from './Legend';
import type { GovStats } from '../types';

interface ControlPanelProps {
  is3D: boolean;
  onToggle2D: () => void;
  onToggle3D: () => void;
  intensity: number;
  onIntensityChange: (v: number) => void;
  onSimulate: () => void;
  computing: boolean;
  computeTime: number | null;
  onFetchWeather: () => void;
  weatherFetching: boolean;
  weatherStatus: string;
  weatherColor: string;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  govStats: GovStats;
  currentTimestep: number;
  onTimestepChange: (t: number) => void;
  onMaxClick: () => void;
  timelineDisabled: boolean;
  routeStatus: string;
  routeColor: string;
  showClearRoute: boolean;
  onClearRoute: () => void;
}

export default function ControlPanel({
  is3D,
  onToggle2D,
  onToggle3D,
  intensity,
  onIntensityChange,
  onSimulate,
  computing,
  computeTime,
  onFetchWeather,
  weatherFetching,
  weatherStatus,
  weatherColor,
  autoRefresh,
  onToggleAutoRefresh,
  govStats,
  currentTimestep,
  onTimestepChange,
  onMaxClick,
  timelineDisabled,
  routeStatus,
  routeColor,
  showClearRoute,
  onClearRoute,
}: ControlPanelProps) {
  return (
    <div className="glass-panel" id="controls">
      <h1>
        CRISIS-FLOW <span className="badge">LIVE</span>
      </h1>
      <p className="subtitle">STGCN Flood Surrogate — Digital Twin</p>

      <div className="view-toggle">
        <button
          className={`toggle-btn ${!is3D ? 'active' : ''}`}
          onClick={onToggle2D}
        >
          2D View
        </button>
        <button
          className={`toggle-btn ${is3D ? 'active' : ''}`}
          onClick={onToggle3D}
        >
          3D View
        </button>
      </div>

      <div className="control-group">
        <label>
          Storm Intensity:{' '}
          <span className="intensity-val">{intensity.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={intensity}
          onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
        />
      </div>

      <button
        className="glow-btn"
        onClick={onSimulate}
        disabled={computing}
      >
        {computing ? 'COMPUTING...' : 'SIMULATE STORM'}
      </button>

      <div className="weather-row">
        <button className="weather-btn" onClick={onFetchWeather}>
          {weatherFetching ? '🌧 Fetching...' : '🌧 Live Weather'}
        </button>
        <button
          className={`auto-btn ${autoRefresh ? 'active' : ''}`}
          onClick={onToggleAutoRefresh}
        >
          {autoRefresh ? '⟳ Live' : '⟳ Auto'}
        </button>
      </div>
      {weatherStatus && (
        <div className="weather-status" style={{ color: weatherColor }}>
          {weatherStatus}
        </div>
      )}

      <div className="stats-panel">
        <div className="stat">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value">99.2%</span>
        </div>
        <div className="stat">
          <span className="stat-label">Compute</span>
          <span className="stat-value">
            {computeTime !== null ? `${computeTime} ms` : '-- ms'}
          </span>
        </div>
      </div>

      <GovDashboard stats={govStats} />

      <Timeline
        currentTimestep={currentTimestep}
        onTimestepChange={onTimestepChange}
        onMaxClick={onMaxClick}
        disabled={timelineDisabled}
      />

      <Legend />

      <RoutingPanel
        routeStatus={routeStatus}
        routeColor={routeColor}
        showClear={showClearRoute}
        onClearRoute={onClearRoute}
      />
    </div>
  );
}

import { useState } from 'react';
import GovDashboard from './GovDashboard';
import Timeline from './Timeline';
import RoutingPanel from './RoutingPanel';
import Legend from './Legend';
import type { GovStats } from '../types';
import type { RouteInfo } from '../hooks/useRouting';

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
  onClearSimulation: () => void;
  timelineDisabled: boolean;
  routeStatus: string;
  routeColor: string;
  showClearRoute: boolean;
  onClearRoute: () => void;
  routeInfo: RouteInfo | null;
  onFindNearest: (type: string) => void;
  hasStartPoint: boolean;
  depthThreshold: number;
  onDepthThresholdChange: (v: number) => void;
  clusterEnabled: boolean;
  onClusterToggle: () => void;
}

function Section({ title, defaultOpen = true, children }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel-section">
      <button className="section-toggle" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="section-chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
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
  onClearSimulation,
  timelineDisabled,
  routeStatus,
  routeColor,
  showClearRoute,
  onClearRoute,
  routeInfo,
  onFindNearest,
  hasStartPoint,
  depthThreshold,
  onDepthThresholdChange,
  clusterEnabled,
  onClusterToggle,
}: ControlPanelProps) {
  return (
    <div className="glass-panel" id="controls">
      <h1>
        CRISIS-FLOW <span className="badge">LIVE</span>
      </h1>
      <p className="subtitle">STGCN Flood Surrogate — Digital Twin</p>

      {/* View + Simulate — always visible */}
      <div className="view-toggle">
        <button
          className={`toggle-btn ${!is3D ? 'active' : ''}`}
          onClick={onToggle2D}
        >
          2D
        </button>
        <button
          className={`toggle-btn ${is3D ? 'active' : ''}`}
          onClick={onToggle3D}
        >
          3D
        </button>
      </div>

      <Section title="Simulation" defaultOpen={true}>
        <div className="control-group">
          <label>
            Storm Intensity{' '}
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
      </Section>

      <Section title="Heatmap Filters" defaultOpen={false}>
        <div className="control-group">
          <label>
            Min Depth{' '}
            <span className="intensity-val">{depthThreshold.toFixed(1)} cm</span>
          </label>
          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={depthThreshold}
            onChange={(e) => onDepthThresholdChange(parseFloat(e.target.value))}
          />
        </div>
        <div className="cluster-row">
          <button
            className={`toggle-btn ${clusterEnabled ? 'active' : ''}`}
            onClick={onClusterToggle}
            style={{ flex: 1 }}
          >
            {clusterEnabled ? '⬡ Cluster: ON' : '⬡ Cluster: OFF'}
          </button>
        </div>
      </Section>

      <Section title="Impact Assessment" defaultOpen={true}>
        <GovDashboard stats={govStats} />
      </Section>

      <Timeline
        currentTimestep={currentTimestep}
        onTimestepChange={onTimestepChange}
        onMaxClick={onMaxClick}
        onClearClick={onClearSimulation}
        disabled={timelineDisabled}
      />

      <Legend />

      <Section title="Routing" defaultOpen={true}>
        <RoutingPanel
          routeStatus={routeStatus}
          routeColor={routeColor}
          showClear={showClearRoute}
          onClearRoute={onClearRoute}
          routeInfo={routeInfo}
          onFindNearest={onFindNearest}
          hasStartPoint={hasStartPoint}
        />
      </Section>
    </div>
  );
}

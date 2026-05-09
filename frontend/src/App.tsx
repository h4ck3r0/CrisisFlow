import { useState, useMemo, useCallback, useEffect } from 'react';
import MapView from './components/MapView';
import ControlPanel from './components/ControlPanel';
import RainEffect from './components/RainEffect';
import Topbar from './components/Topbar';
import RolePanel from './components/RolePanel';
import { useFloodSimulation } from './hooks/useFloodSimulation';
import { useWeather } from './hooks/useWeather';
import { useRouting } from './hooks/useRouting';
import { useFloodClustering } from './hooks/useFloodClustering';
import { useDashboard } from './hooks/useDashboard';
import { ROLES, type RoleId } from './constants/roles';
import {
  INITIAL_VIEW_STATE,
  VIEW_STATE_2D,
  VIEW_STATE_3D,
  EMERGENCY_INFRA,
} from './constants';
import type { FloodPoint, GovStats, ViewState } from './types';
import './dashboard.css';

function App() {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [is3D, setIs3D] = useState(false);
  const [intensity, setIntensity] = useState(0.0);
  const [currentTimestep, setCurrentTimestep] = useState(-1);
  const [depthThreshold, setDepthThreshold] = useState(1.0);
  const [clusterEnabled, setClusterEnabled] = useState(true);
  const [barricadeMode, setBarricadeMode] = useState(false);

  // Role state
  const [currentRole, setCurrentRole] = useState<RoleId>('gov');
  const [alert, setAlert] = useState<string | null>(null);
  const [currentPoint, setCurrentPoint] = useState<[number, number] | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const { floodPoints, floodTimeline, computing, computeTime, simulate, clearSimulation } =
    useFloodSimulation();
  const {
    weatherStatus,
    weatherColor,
    fetching: weatherFetching,
    autoRefresh,
    fetchWeather,
    toggleAutoRefresh,
  } = useWeather();
  const {
    clickPoints, routeCoords, routeSegments, routeStatus, routeColor,
    routeInfo, handleMapClick, recalculateRoute, findNearest, clearRoute,
  } = useRouting();

  // MongoDB dashboard data
  const { data: dashboardData, fetchDashboard, createBarricade, deleteBarricade } = useDashboard();

  // Role change handler
  const handleRoleChange = useCallback((role: RoleId) => {
    setCurrentRole(role);
    fetchDashboard(role);
    const cfg = ROLES[role];
    document.documentElement.style.setProperty('--role-color', cfg.color);
    document.documentElement.style.setProperty('--role-bg', cfg.bg);
    document.documentElement.style.setProperty('--role-border', cfg.border);
  }, [fetchDashboard]);

  // Set initial role theme
  useEffect(() => {
    const cfg = ROLES[currentRole];
    document.documentElement.style.setProperty('--role-color', cfg.color);
    document.documentElement.style.setProperty('--role-bg', cfg.bg);
    document.documentElement.style.setProperty('--role-border', cfg.border);
  }, [currentRole]);

  const activeFloodPoints = useMemo((): FloodPoint[] => {
    if (currentTimestep === -2) return [];
    if (currentTimestep === -1 || floodTimeline.length === 0) return floodPoints;
    return floodPoints.map((p, i) => ({
      lon: p.lon,
      lat: p.lat,
      depth: floodTimeline[currentTimestep]?.[i] ?? 0,
    }));
  }, [floodPoints, floodTimeline, currentTimestep]);

  const clusteredPoints = useFloodClustering(activeFloodPoints, depthThreshold, clusterEnabled);

  const emergencyData = useMemo(() => {
    const active = activeFloodPoints;
    if (active.length === 0) return EMERGENCY_INFRA.map((f) => ({ ...f, accessible: true }));
    return EMERGENCY_INFRA.map((f) => {
      let minDist = Infinity;
      let nearDepth = 0;
      for (const p of active) {
        const dist = Math.abs(p.lon - f.lon) + Math.abs(p.lat - f.lat);
        if (dist < minDist) {
          minDist = dist;
          nearDepth = p.depth;
        }
      }
      return { ...f, accessible: nearDepth < 0.2 };
    });
  }, [activeFloodPoints]);

  const govStats = useMemo((): GovStats => {
    const points = activeFloodPoints;
    if (points.length === 0)
      return { affected: 0, total: 0, critical: 0, maxDepth: 0, dangerous: 0 };
    return {
      total: points.length,
      affected: points.filter((p) => p.depth > 0.05).length,
      critical: points.filter((p) => p.depth > 1.0).length,
      maxDepth: Math.max(...points.map((p) => p.depth)),
      dangerous: points.filter((p) => p.depth > 0.3).length,
    };
  }, [activeFloodPoints]);

  const handleToggle2D = useCallback(() => {
    setIs3D(false);
    setViewState((prev) => ({ ...prev, ...VIEW_STATE_2D }));
  }, []);

  const handleToggle3D = useCallback(() => {
    setIs3D(true);
    setViewState((prev) => ({ ...prev, ...VIEW_STATE_3D }));
  }, []);

  const handleSimulate = useCallback(async () => {
    if (intensity <= 0.05) {
      clearSimulation();
      setCurrentTimestep(-2);
      return;
    }
    if (currentTimestep === -2) setCurrentTimestep(-1);
    const result = await simulate(intensity);
    if (result) {
      fetchDashboard(currentRole);
      if (routeCoords) recalculateRoute(intensity);
    }
  }, [intensity, simulate, routeCoords, recalculateRoute, currentTimestep, clearSimulation, fetchDashboard, currentRole]);

  const handleClearSimulation = useCallback(() => {
    clearSimulation();
    setCurrentTimestep(-2);
  }, [clearSimulation]);

  const handleIntensityChange = useCallback((val: number) => {
    setIntensity(val);
    if (val <= 0.05) { clearSimulation(); setCurrentTimestep(-2); }
  }, [clearSimulation]);

  const handleFetchWeather = useCallback(async () => {
    const newIntensity = await fetchWeather();
    if (newIntensity !== null) {
      setIntensity(newIntensity);
      if (newIntensity <= 0.05) { clearSimulation(); setCurrentTimestep(-2); }
      else { 
        setCurrentTimestep(0); 
        const result = await simulate(newIntensity); 
        if (result) fetchDashboard(currentRole);
      }
      if (routeCoords) recalculateRoute(newIntensity);
    }
  }, [fetchWeather, clearSimulation, simulate, routeCoords, recalculateRoute, fetchDashboard, currentRole]);

  const handleAutoRefresh = useCallback(() => {
    toggleAutoRefresh(async () => {
      const newIntensity = await fetchWeather();
      if (newIntensity !== null) {
        setIntensity(newIntensity);
        if (newIntensity <= 0.05) { clearSimulation(); setCurrentTimestep(-2); }
        else { 
          setCurrentTimestep(0); 
          const result = await simulate(newIntensity); 
          if (result) fetchDashboard(currentRole);
        }
        if (routeCoords) recalculateRoute(newIntensity);
      }
    });
  }, [toggleAutoRefresh, fetchWeather, clearSimulation, simulate, routeCoords, recalculateRoute, fetchDashboard, currentRole]);

  const onMapClick = useCallback(
    async (coordinate: [number, number]) => {
      if (barricadeMode) {
        setAlert("🔨 Snapping barricade to road node...");
        const res = await createBarricade(coordinate[1], coordinate[0]);
        if (res) {
          setAlert(`🚧 Barricade active: ${res.block_id}`);
          setTimeout(() => setAlert(null), 3000);
          setBarricadeMode(false);
        }
        return;
      }
      setCurrentPoint(coordinate);
      handleMapClick(coordinate, intensity);
    },
    [handleMapClick, intensity, barricadeMode, createBarricade]
  );

  const handleFindNearest = useCallback((type: string) => {
    const pt = clickPoints.length > 0 ? clickPoints[0] : currentPoint;
    if (pt) findNearest(pt[1], pt[0], type, intensity);
  }, [clickPoints, currentPoint, findNearest, intensity]);

  const handleZoneClick = useCallback((lat: number, lng: number) => {
    setViewState((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      zoom: 15,
      transitionDuration: 1000,
    }));
  }, []);

  const handleDeleteBarricade = useCallback(async (id: string) => {
    const res = await deleteBarricade(id);
    if (res) {
      setAlert("♻️ Road cleared. Recalculating routes...");
      recalculateRoute(intensity);
      setTimeout(() => setAlert(null), 2000);
    }
  }, [deleteBarricade, recalculateRoute, intensity]);



  return (
    <div className="cf-shell">
      <Topbar 
        currentRole={currentRole} 
        onRoleChange={handleRoleChange} 
        intensity={intensity}
        simulationActive={intensity > 0.05}
        onClearRoute={clearRoute}
        routeActive={clickPoints.length > 0}
      />

      <div className="cf-main">
        <div className="cf-map-wrap">
          <MapView
            viewState={viewState}
            onViewStateChange={setViewState}
            is3D={is3D}
            activeFloodPoints={clusteredPoints}
            emergencyData={emergencyData}
            clickPoints={clickPoints}
            routeCoords={routeCoords}
            routeSegments={routeSegments}
            onMapClick={onMapClick}
            currentPoint={currentPoint}
            roadBlocks={dashboardData?.active_road_blocks || dashboardData?.road_blocks || []}
          />
          <RainEffect intensity={intensity} active={intensity > 0.05} />

          {/* Simulation controls — Gov only, minimizable */}
          {currentRole === 'gov' && (
            <>
              <button
                className="cf-panel-toggle"
                onClick={() => setPanelOpen(!panelOpen)}
                title={panelOpen ? 'Minimize panel' : 'Expand panel'}
              >
                {panelOpen ? '◀ Hide' : '▶ STGCN Controls'}
              </button>
              {panelOpen && (
                <ControlPanel
                  is3D={is3D}
                  onToggle2D={handleToggle2D}
                  onToggle3D={handleToggle3D}
                  intensity={intensity}
                  onIntensityChange={handleIntensityChange}
                  onSimulate={handleSimulate}
                  computing={computing}
                  computeTime={computeTime}
                  onFetchWeather={handleFetchWeather}
                  weatherFetching={weatherFetching}
                  weatherStatus={weatherStatus}
                  weatherColor={weatherColor}
                  autoRefresh={autoRefresh}
                  onToggleAutoRefresh={handleAutoRefresh}
                  govStats={govStats}
                  currentTimestep={currentTimestep}
                  onTimestepChange={(t) => setCurrentTimestep(t)}
                  onMaxClick={() => setCurrentTimestep(-1)}
                  onClearSimulation={handleClearSimulation}
                  timelineDisabled={floodTimeline.length === 0}
                  routeStatus={routeStatus}
                  routeColor={routeColor}
                  showClearRoute={clickPoints.length > 0}
                  onClearRoute={clearRoute}
                  routeInfo={routeInfo}
                  onFindNearest={handleFindNearest}
                  hasStartPoint={clickPoints.length > 0 || currentPoint !== null}
                  depthThreshold={depthThreshold}
                  onDepthThresholdChange={setDepthThreshold}
                  clusterEnabled={clusterEnabled}
                  onClusterToggle={() => setClusterEnabled(!clusterEnabled)}
                />
              )}
            </>
          )}
        </div>

        {/* Right panel — role-specific data */}
        <RolePanel
          role={currentRole}
          data={dashboardData}
          onRefresh={() => fetchDashboard(currentRole)}
          currentPoint={currentPoint}
          onFindNearest={handleFindNearest}
          routeInfo={routeInfo}
          routeStatus={routeStatus}
          routeColor={routeColor}
          hasStartPoint={clickPoints.length > 0 || currentPoint !== null}
          onZoneClick={handleZoneClick}
          barricadeMode={barricadeMode}
          onToggleBarricade={() => setBarricadeMode(!barricadeMode)}
          onDeleteBarricade={handleDeleteBarricade}
        />
      </div>

      {alert && <div className="alert-overlay">{alert}</div>}
    </div>
  );
}

export default App;

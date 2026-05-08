import { useState, useMemo, useCallback } from 'react';
import MapView from './components/MapView';
import ControlPanel from './components/ControlPanel';
import RainEffect from './components/RainEffect';
import { useFloodSimulation } from './hooks/useFloodSimulation';
import { useWeather } from './hooks/useWeather';
import { useRouting } from './hooks/useRouting';
import {
  INITIAL_VIEW_STATE,
  VIEW_STATE_2D,
  VIEW_STATE_3D,
  EMERGENCY_INFRA,
} from './constants';
import type { FloodPoint, GovStats, ViewState } from './types';

function App() {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [is3D, setIs3D] = useState(false);
  const [intensity, setIntensity] = useState(0.5);
  const [currentTimestep, setCurrentTimestep] = useState(-1);

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
  const { clickPoints, routeCoords, routeStatus, routeColor, handleMapClick, recalculateRoute, clearRoute } =
    useRouting();

  const activeFloodPoints = useMemo((): FloodPoint[] => {
    if (currentTimestep === -2) return [];
    if (currentTimestep === -1 || floodTimeline.length === 0) return floodPoints;
    return floodPoints.map((p, i) => ({
      lon: p.lon,
      lat: p.lat,
      depth: floodTimeline[currentTimestep]?.[i] ?? 0,
    }));
  }, [floodPoints, floodTimeline, currentTimestep]);

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
      return { ...f, accessible: nearDepth < 5 };
    });
  }, [activeFloodPoints]);

  const govStats = useMemo((): GovStats => {
    const points = activeFloodPoints;
    if (points.length === 0)
      return { affected: 0, total: 0, critical: 0, maxDepth: 0, dangerous: 0 };
    return {
      total: points.length,
      affected: points.filter((p) => p.depth > 0.5).length,
      critical: points.filter((p) => p.depth > 10).length,
      maxDepth: Math.max(...points.map((p) => p.depth)),
      dangerous: points.filter((p) => p.depth > 5).length,
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
    if (currentTimestep === -2) {
      setCurrentTimestep(-1);
    }
    const result = await simulate(intensity);
    if (result && clickPoints.length === 2) {
      recalculateRoute(intensity);
    }
  }, [intensity, simulate, clickPoints, recalculateRoute, currentTimestep]);

  const handleClearSimulation = useCallback(() => {
    clearSimulation();
    setCurrentTimestep(-2);
  }, [clearSimulation]);

  const handleFetchWeather = useCallback(async () => {
    const newIntensity = await fetchWeather();
    if (newIntensity !== null) {
      setIntensity(newIntensity);
      if (newIntensity <= 0.05) {
        clearSimulation();
        setCurrentTimestep(-2);
      }
    }
  }, [fetchWeather, clearSimulation]);

  const handleAutoRefresh = useCallback(() => {
    toggleAutoRefresh(async () => {
      const newIntensity = await fetchWeather();
      if (newIntensity !== null) {
        setIntensity(newIntensity);
        await simulate(newIntensity);
      }
    });
  }, [toggleAutoRefresh, fetchWeather, simulate]);

  const onMapClick = useCallback(
    (coordinate: [number, number]) => {
      handleMapClick(coordinate, intensity);
    },
    [handleMapClick, intensity]
  );

  return (
    <div className="app-root">
      <MapView
        viewState={viewState}
        onViewStateChange={setViewState}
        is3D={is3D}
        activeFloodPoints={activeFloodPoints}
        emergencyData={emergencyData}
        clickPoints={clickPoints}
        routeCoords={routeCoords}
        onMapClick={onMapClick}
      />
      <RainEffect
        intensity={intensity}
        active={activeFloodPoints.length > 0}
      />
      <ControlPanel
        is3D={is3D}
        onToggle2D={handleToggle2D}
        onToggle3D={handleToggle3D}
        intensity={intensity}
        onIntensityChange={setIntensity}
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
      />
    </div>
  );
}

export default App;

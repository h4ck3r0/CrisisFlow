interface RoutingPanelProps {
  routeStatus: string;
  routeColor: string;
  showClear: boolean;
  onClearRoute: () => void;
}

export default function RoutingPanel({
  routeStatus,
  routeColor,
  showClear,
  onClearRoute,
}: RoutingPanelProps) {
  return (
    <div className="routing-section">
      <h3>AI Dynamic Routing</h3>
      <p>Click two points on the map to find a safe route.</p>
      <div className="route-status" style={{ color: routeColor }}>
        {routeStatus}
      </div>
      {showClear && (
        <button className="outline-btn" onClick={onClearRoute}>
          Clear Route
        </button>
      )}
    </div>
  );
}

export default function Legend() {
  return (
    <>
      <div className="legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#3cb44a' }} />
          Safe
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#ffd200' }} />
          Caution
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#ff8c00' }} />
          Dangerous
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#ff1e3c' }} />
          Impassable
        </div>
      </div>
      <div className="legend">
        <div className="legend-item">
          <span className="legend-icon">🏥</span>
          Hospital
        </div>
        <div className="legend-item">
          <span className="legend-icon">🚒</span>
          Fire Stn
        </div>
        <div className="legend-item">
          <span className="legend-icon">🚔</span>
          Police
        </div>
        <div className="legend-item">
          <span className="legend-icon">🏠</span>
          Shelter
        </div>
      </div>
    </>
  );
}

interface TimelineProps {
  currentTimestep: number;
  onTimestepChange: (t: number) => void;
  onMaxClick: () => void;
  disabled: boolean;
}

export default function Timeline({
  currentTimestep,
  onTimestepChange,
  onMaxClick,
  disabled,
}: TimelineProps) {
  const label =
    currentTimestep === -1 ? 'Peak (Max)' : `${currentTimestep * 10} min`;

  return (
    <div className="timeline-section">
      <label>
        Timeline: <span className="timeline-val">{label}</span>
      </label>
      <div className="timeline-row">
        <input
          type="range"
          min={0}
          max={11}
          step={1}
          value={currentTimestep === -1 ? 0 : currentTimestep}
          disabled={disabled}
          onChange={(e) => onTimestepChange(parseInt(e.target.value))}
        />
        <button
          className={`max-btn ${currentTimestep === -1 ? 'active' : ''}`}
          onClick={onMaxClick}
        >
          MAX
        </button>
      </div>
      <div className="timeline-ticks">
        <span>0m</span>
        <span>40m</span>
        <span>80m</span>
        <span>120m</span>
      </div>
    </div>
  );
}

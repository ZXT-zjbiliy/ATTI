import type { SessionProgressState } from "../types/sidepanel-shell";

interface SessionProgressBarProps {
  readonly state: SessionProgressState;
}

export function SessionProgressBar({ state }: SessionProgressBarProps) {
  const progressPercent =
    state.totalCount > 0 ? Math.max(0, Math.min(100, (state.completedCount / state.totalCount) * 100)) : 0;

  return (
    <div className="atti-stack atti-stack--tight">
      <p className="atti-status-text">
        <span aria-hidden="true">{state.requestIcon}</span>
        {" "}
        {state.requestLabel}
      </p>
      <p className="atti-status-text">{state.label}</p>
      <div aria-label="答题规划进度" className="atti-progress">
        <div className="atti-progress__bar" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}

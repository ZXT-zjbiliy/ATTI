import type { SessionProgressState, SidePanelSectionState } from "../types/sidepanel-shell";
import { SectionStateView } from "./section-state-view";
import { SessionProgressBar } from "./session-progress-bar";
import { StatusCard } from "./status-card";

interface PageDetectionStatusCardProps {
  readonly state: SidePanelSectionState;
  readonly progress: SessionProgressState | null;
  readonly onRefresh: () => void;
  readonly onReextract: () => void;
  readonly isReextractDisabled: boolean;
}

export function PageDetectionStatusCard({
  state,
  progress,
  onRefresh,
  onReextract,
  isReextractDisabled
}: PageDetectionStatusCardProps) {
  return (
    <StatusCard title="页面识别">
      <button className="atti-button atti-button--secondary" type="button" onClick={onRefresh}>
        刷新页面识别
      </button>
      <button
        className="atti-button atti-button--secondary"
        disabled={isReextractDisabled}
        type="button"
        onClick={onReextract}
      >
        重新提取题目
      </button>
      <SectionStateView state={state} />
      {progress ? <SessionProgressBar state={progress} /> : null}
    </StatusCard>
  );
}

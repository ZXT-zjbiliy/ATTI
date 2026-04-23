import type { SidePanelSectionState } from "../types/sidepanel-shell";
import { SectionStateView } from "./section-state-view";
import { StatusCard } from "./status-card";

interface PageDetectionStatusCardProps {
  readonly state: SidePanelSectionState;
  readonly onRefresh: () => void;
}

export function PageDetectionStatusCard({
  state,
  onRefresh
}: PageDetectionStatusCardProps) {
  return (
    <StatusCard title="页面识别">
      <button className="atti-button atti-button--secondary" type="button" onClick={onRefresh}>
        刷新页面识别
      </button>
      <SectionStateView state={state} />
    </StatusCard>
  );
}

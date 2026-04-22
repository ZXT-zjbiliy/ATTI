import type { SidePanelSectionState } from "../types/sidepanel-shell";
import { SectionStateView } from "./section-state-view";
import { StatusCard } from "./status-card";

interface PageDetectionStatusCardProps {
  readonly state: SidePanelSectionState;
}

export function PageDetectionStatusCard({ state }: PageDetectionStatusCardProps) {
  return (
    <StatusCard title="页面识别">
      <SectionStateView state={state} />
    </StatusCard>
  );
}

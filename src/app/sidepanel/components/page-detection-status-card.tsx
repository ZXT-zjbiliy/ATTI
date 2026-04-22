import type { SidePanelSectionState } from "../types/sidepanel-shell";
import { SectionStateView } from "./section-state-view";
import { StatusCard } from "./status-card";

interface PageDetectionStatusCardProps {
  readonly state: SidePanelSectionState;
}

export function PageDetectionStatusCard({ state }: PageDetectionStatusCardProps) {
  return (
    <StatusCard title="Page Detection Status">
      <SectionStateView state={state} />
    </StatusCard>
  );
}

import type { SidePanelSectionState } from "../types/sidepanel-shell";
import { SectionStateView } from "./section-state-view";
import { StatusCard } from "./status-card";

interface SessionStatusCardProps {
  readonly state: SidePanelSectionState;
  readonly isRunAnswerPlanningDisabled: boolean;
  readonly onRunAnswerPlanning: () => void;
}

export function SessionStatusCard({
  state,
  isRunAnswerPlanningDisabled,
  onRunAnswerPlanning
}: SessionStatusCardProps) {
  return (
    <StatusCard title="Session Status">
      <SectionStateView state={state} />
      <button
        disabled={isRunAnswerPlanningDisabled}
        type="button"
        onClick={onRunAnswerPlanning}
      >
        Run answer planning
      </button>
    </StatusCard>
  );
}

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
    <StatusCard title="执行会话">
      <SectionStateView state={state} />
      <button
        className="atti-button"
        disabled={isRunAnswerPlanningDisabled}
        type="button"
        onClick={onRunAnswerPlanning}
      >
        开始 AI 规划
      </button>
    </StatusCard>
  );
}

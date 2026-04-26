import type { SessionProgressState, SidePanelSectionState } from "../types/sidepanel-shell";
import { SectionStateView } from "./section-state-view";
import { SessionProgressBar } from "./session-progress-bar";
import { StatusCard } from "./status-card";

interface SessionStatusCardProps {
  readonly state: SidePanelSectionState;
  readonly progress: SessionProgressState | null;
  readonly isRunAnswerPlanningDisabled: boolean;
  readonly isReapplyAnswerFillDisabled: boolean;
  readonly onRunAnswerPlanning: () => void;
  readonly onReapplyAnswerFill: () => void;
}

export function SessionStatusCard({
  state,
  progress,
  isRunAnswerPlanningDisabled,
  isReapplyAnswerFillDisabled,
  onRunAnswerPlanning,
  onReapplyAnswerFill
}: SessionStatusCardProps) {
  return (
    <StatusCard title="执行会话">
      <SectionStateView state={state} />
      {progress ? <SessionProgressBar state={progress} /> : null}
      <button
        className="atti-button"
        disabled={isRunAnswerPlanningDisabled}
        type="button"
        onClick={onRunAnswerPlanning}
      >
        开始 AI 规划
      </button>
      <button
        className="atti-button"
        disabled={isReapplyAnswerFillDisabled}
        type="button"
        onClick={onReapplyAnswerFill}
      >
        再次填写
      </button>
    </StatusCard>
  );
}

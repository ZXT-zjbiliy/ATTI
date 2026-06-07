import type { SidePanelSectionState } from "../types/sidepanel-shell";

interface SectionStateViewProps {
  readonly state: SidePanelSectionState;
}

export function SectionStateView({ state }: SectionStateViewProps) {
  if (state.kind === "loading") {
    return <p className="atti-status-text atti-status-text--loading">加载中：{state.message}</p>;
  }

  if (state.kind === "empty") {
    return <p className="atti-status-text atti-status-text--empty">空状态：{state.message}</p>;
  }

  if (state.kind === "error") {
    return (
      <p className="atti-status-text atti-status-text--error" role="alert">
        错误：{state.message}
      </p>
    );
  }

  return (
    <div className="atti-stack atti-stack--tight">
      <div className="atti-status-pair">
        <strong>{state.summary}</strong>
      </div>
      <p className="atti-status-text">{state.detail}</p>
    </div>
  );
}

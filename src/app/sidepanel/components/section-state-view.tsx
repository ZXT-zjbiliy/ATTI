import type { SidePanelSectionState } from "../types/sidepanel-shell";

interface SectionStateViewProps {
  readonly state: SidePanelSectionState;
}

export function SectionStateView({ state }: SectionStateViewProps) {
  if (state.kind === "loading") {
    return <p>Loading: {state.message}</p>;
  }

  if (state.kind === "empty") {
    return <p>Empty: {state.message}</p>;
  }

  if (state.kind === "error") {
    return <p role="alert">Error: {state.message}</p>;
  }

  return (
    <>
      <p>{state.summary}</p>
      <p>{state.detail}</p>
    </>
  );
}

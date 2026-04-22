import type { ProviderConfigurationState } from "../../../shared/utils/provider-configuration";

interface ProviderStatusNoteProps {
  readonly state: ProviderConfigurationState;
}

export function ProviderStatusNote({ state }: ProviderStatusNoteProps) {
  return (
    <>
      <p>{state.summary}</p>
      {state.actionMessage ? <p role="alert">{state.actionMessage}</p> : null}
    </>
  );
}

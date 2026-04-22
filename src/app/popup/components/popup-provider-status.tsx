import type { ProviderConfigurationState } from "../../../shared/utils/provider-configuration";

interface PopupProviderStatusProps {
  readonly state: ProviderConfigurationState;
}

export function PopupProviderStatus({ state }: PopupProviderStatusProps) {
  return (
    <section aria-label="Provider Status">
      <p>{state.summary}</p>
      {state.actionMessage ? <p role="alert">{state.actionMessage}</p> : null}
    </section>
  );
}

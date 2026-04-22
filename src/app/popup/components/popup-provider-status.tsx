import type { ProviderConfigurationState } from "../../../shared/utils/provider-configuration";

interface PopupProviderStatusProps {
  readonly state: ProviderConfigurationState;
}

export function PopupProviderStatus({ state }: PopupProviderStatusProps) {
  return (
    <section aria-label="Provider 状态" className="atti-card">
      <div className="atti-row">
        <h2 className="atti-card__title">Provider 状态</h2>
        <span
          className={`atti-badge ${state.isReady ? "atti-badge--ready" : "atti-badge--warning"}`}
        >
          {state.isReady ? "已就绪" : "待配置"}
        </span>
      </div>
      <p className="atti-status-text">{state.summary}</p>
      {state.actionMessage ? (
        <p className="atti-alert atti-alert--warning" role="alert">
          {state.actionMessage}
        </p>
      ) : null}
    </section>
  );
}

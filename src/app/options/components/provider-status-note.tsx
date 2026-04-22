import type { ProviderConfigurationState } from "../../../shared/utils/provider-configuration";

interface ProviderStatusNoteProps {
  readonly state: ProviderConfigurationState;
}

export function ProviderStatusNote({ state }: ProviderStatusNoteProps) {
  return (
    <section className="atti-card" aria-label="当前 AI 就绪状态">
      <div className="atti-row">
        <h2 className="atti-card__title">当前 AI 就绪状态</h2>
        <span
          className={`atti-badge ${state.isReady ? "atti-badge--ready" : "atti-badge--warning"}`}
        >
          {state.isReady ? "可运行" : "需补充配置"}
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

import { usePopupShell, type PopupShellModel } from "./hooks/use-popup-shell";
import { PopupBoundarySummary } from "./components/popup-boundary-summary";
import { PopupProviderStatus } from "./components/popup-provider-status";

interface PopupViewProps {
  readonly model: PopupShellModel;
}

function getToggleLabel(model: PopupShellModel): string {
  if (model.isLoading) {
    return "正在读取扩展状态...";
  }

  return model.extensionEnabled ? "扩展已启用" : "扩展已暂停";
}

export function PopupView({ model }: PopupViewProps) {
  return (
    <main className="atti-shell atti-shell--popup">
      <div className="atti-frame">
        <div className="atti-frame__content">
          <header className="atti-hero">
            <span className="atti-hero__eyebrow">AI 驱动的多站点过渡版</span>
            <h1 className="atti-hero__title">ATTI 智能助手</h1>
            <p className="atti-hero__subtitle">
              当前界面已切换为中文体验，产品路线正在向 AI-first 适配演进，稳定试用路径仍以
              Truity 九型人格页面为主。
            </p>
          </header>
          <section className="atti-grid atti-grid--columns-2">
            <div className="atti-kpi">
              <span className="atti-kpi__label">运行状态</span>
              <strong className="atti-kpi__value">{getToggleLabel(model)}</strong>
            </div>
            <div className="atti-kpi">
              <span className="atti-kpi__label">当前模式</span>
              <strong className="atti-kpi__value">中文前台 / AI-first 过渡版</strong>
            </div>
          </section>
          <label className="atti-toggle">
            <span className="atti-field__label">启用扩展</span>
            <input
              aria-label="启用扩展"
              checked={model.extensionEnabled}
              className="atti-checkbox"
              disabled={model.isLoading || model.isUpdating}
              onChange={() => {
                void model.toggleExtensionEnabled();
              }}
              type="checkbox"
            />
          </label>
          <div className="atti-row">
            <button
              className="atti-button"
              disabled={model.isLoading}
              onClick={() => {
                void model.openSidePanel();
              }}
              type="button"
            >
              打开侧边栏
            </button>
          </div>
          {model.providerConfiguration ? (
            <PopupProviderStatus state={model.providerConfiguration} />
          ) : null}
          <PopupBoundarySummary />
          {model.statusMessage ? (
            <p className="atti-alert atti-alert--error" role="status">
              {model.statusMessage}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export function PopupApp() {
  const model = usePopupShell();

  return <PopupView model={model} />;
}

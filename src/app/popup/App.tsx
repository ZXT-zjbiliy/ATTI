import { usePopupShell, type PopupShellModel } from "./hooks/use-popup-shell";
import { PopupBoundarySummary } from "./components/popup-boundary-summary";
import { PopupProviderStatus } from "./components/popup-provider-status";

interface PopupViewProps {
  readonly model: PopupShellModel;
}

function getToggleLabel(model: PopupShellModel): string {
  if (model.isLoading) {
    return "Loading extension status...";
  }

  return model.extensionEnabled ? "ATTI is enabled" : "ATTI is disabled";
}

export function PopupView({ model }: PopupViewProps) {
  return (
    <main>
      <h1>ATTI</h1>
      <p>{getToggleLabel(model)}</p>
      <label>
        <span>Enable extension</span>
        <input
          aria-label="Enable extension"
          checked={model.extensionEnabled}
          disabled={model.isLoading || model.isUpdating}
          onChange={() => {
            void model.toggleExtensionEnabled();
          }}
          type="checkbox"
        />
      </label>
      <button
        disabled={model.isLoading}
        onClick={() => {
          void model.openSidePanel();
        }}
        type="button"
      >
        Open side panel
      </button>
      {model.providerConfiguration ? (
        <PopupProviderStatus state={model.providerConfiguration} />
      ) : null}
      <PopupBoundarySummary />
      {model.statusMessage ? <p role="status">{model.statusMessage}</p> : null}
    </main>
  );
}

export function PopupApp() {
  const model = usePopupShell();

  return <PopupView model={model} />;
}

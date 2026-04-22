import type { OptionsShellModel } from "./hooks/use-options-shell";
import { useOptionsShell } from "./hooks/use-options-shell";
import { DataManagementSection } from "./components/data-management-section";
import { DebugViewSection } from "./components/debug-view-section";
import { DebugModeSection } from "./components/debug-mode-section";
import { ProviderSelectionSection } from "./components/provider-selection-section";
import { ProviderBoundarySection } from "./components/provider-boundary-section";
import { ProviderStatusNote } from "./components/provider-status-note";

interface OptionsViewProps {
  readonly model: OptionsShellModel;
}

export function OptionsView({ model }: OptionsViewProps) {
  const settings = model.settings;

  return (
    <main>
      <header>
        <h1>ATTI Options</h1>
        <p>Configure lightweight extension settings stored on this device.</p>
      </header>
      <DebugModeSection
        debugMode={settings?.debugMode ?? false}
        disabled={model.isLoading || model.isSaving}
        onToggle={(debugMode) => {
          void model.updateDebugMode(debugMode);
        }}
      />
      <ProviderSelectionSection
        activeProvider={model.providerConfiguration?.normalizedActiveProvider ?? "openai"}
        disabled={model.isLoading || model.isSaving}
        openAiApiKey={settings?.openAiApiKey ?? ""}
        providerStatus={model.providerConfiguration}
        onOpenAiApiKeyChange={(openAiApiKey) => {
          void model.updateOpenAiApiKey(openAiApiKey);
        }}
        onSelect={(activeProvider) => {
          void model.updateProvider(activeProvider);
        }}
      />
      {model.providerConfiguration ? (
        <ProviderStatusNote state={model.providerConfiguration} />
      ) : null}
      <ProviderBoundarySection />
      <DataManagementSection />
      {settings?.debugMode ? (
        <DebugViewSection
          isLoading={model.isDebugViewLoading}
          snapshot={model.debugSnapshot}
        />
      ) : null}
      {model.statusMessage ? <p role="status">{model.statusMessage}</p> : null}
    </main>
  );
}

export function OptionsApp() {
  const model = useOptionsShell();

  return <OptionsView model={model} />;
}

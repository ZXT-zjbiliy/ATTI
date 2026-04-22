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
    <main className="atti-shell atti-shell--options">
      <div className="atti-frame">
        <div className="atti-frame__content">
          <header className="atti-hero">
            <span className="atti-hero__eyebrow">中文前台 / AI-first 过渡版</span>
            <h1 className="atti-hero__title">ATTI 设置</h1>
            <p className="atti-hero__subtitle">
              当前阶段先把前台体验和产品路线切到 AI-first，多站点稳定适配仍会分阶段落地。
            </p>
          </header>
          <section className="atti-grid atti-grid--columns-2">
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
          </section>
          {model.statusMessage ? (
            <p className="atti-alert atti-alert--info" role="status">
              {model.statusMessage}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export function OptionsApp() {
  const model = useOptionsShell();

  return <OptionsView model={model} />;
}

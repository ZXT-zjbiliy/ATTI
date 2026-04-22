import { OptionsSection } from "./options-section";
import type { ProviderConfigurationState } from "../../../shared/utils/provider-configuration";

interface ProviderSelectionSectionProps {
  readonly activeProvider: string;
  readonly openAiApiKey: string;
  readonly providerStatus: ProviderConfigurationState | null;
  readonly disabled: boolean;
  readonly onSelect: (activeProvider: string) => void;
  readonly onOpenAiApiKeyChange: (openAiApiKey: string) => void;
}

const providerOptions = [
  { value: "openai", label: "OpenAI Provider" },
  { value: "local", label: "Local Provider (Dev Fallback)" },
] as const;

export function ProviderSelectionSection({
  activeProvider,
  openAiApiKey,
  providerStatus,
  disabled,
  onSelect,
  onOpenAiApiKeyChange
}: ProviderSelectionSectionProps) {
  return (
    <OptionsSection title="Provider Selection">
      <p>Configure the provider used for single-site answer planning. OpenAI is the primary MVP path.</p>
      <label>
        <span>Provider</span>
        <select
          aria-label="Provider"
          disabled={disabled}
          onChange={(event) => {
            onSelect(event.currentTarget.value);
          }}
          value={activeProvider}
        >
          {providerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>OpenAI API key</span>
        <input
          aria-label="OpenAI API key"
          disabled={disabled}
          onChange={(event) => {
            onOpenAiApiKeyChange(event.currentTarget.value);
          }}
          placeholder="sk-..."
          type="password"
          value={openAiApiKey}
        />
      </label>
      <p>
        OpenAI key status:{" "}
        {providerStatus?.usesOpenAi
          ? providerStatus.hasOpenAiApiKey
            ? "Saved locally"
            : "Missing"
          : providerStatus?.hasOpenAiApiKey
            ? "Saved locally and unused while local fallback is selected"
            : "Not required for the local fallback"}
      </p>
    </OptionsSection>
  );
}

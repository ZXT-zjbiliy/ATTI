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
  { value: "openai", label: "OpenAI（主路径）" },
  { value: "local", label: "本地回退（开发用）" },
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
    <OptionsSection title="AI Provider 设置">
      <p className="atti-copy-muted">
        当前产品正过渡到 AI-first 多站点路线；稳定试用路径仍以 OpenAI + Truity 为主。
      </p>
      <label className="atti-field">
        <span className="atti-field__label">当前规划引擎</span>
        <select
          aria-label="当前规划引擎"
          className="atti-select"
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
      <label className="atti-field">
        <span className="atti-field__label">OpenAI API key</span>
        <input
          aria-label="OpenAI API key"
          className="atti-input"
          disabled={disabled}
          onChange={(event) => {
            onOpenAiApiKeyChange(event.currentTarget.value);
          }}
          placeholder="sk-..."
          type="password"
          value={openAiApiKey}
        />
      </label>
      <p className="atti-status-text">
        OpenAI 密钥状态：
        {" "}
        {providerStatus?.usesOpenAi
          ? providerStatus.hasOpenAiApiKey
            ? "已保存在本地"
            : "缺失"
          : providerStatus?.hasOpenAiApiKey
            ? "已保存在本地，但当前未启用"
            : "当前模式无需填写"}
      </p>
    </OptionsSection>
  );
}

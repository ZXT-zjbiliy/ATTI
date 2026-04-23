import { useEffect, useState } from "react";

import { OptionsSection } from "./options-section";
import type { ProviderConfigurationState } from "../../../shared/utils/provider-configuration";

interface ProviderSelectionSectionProps {
  readonly activeProvider: string;
  readonly providerApiKey: string;
  readonly providerBaseUrl: string;
  readonly providerModel: string;
  readonly providerStatus: ProviderConfigurationState | null;
  readonly disabled: boolean;
  readonly onSelect: (activeProvider: string) => void;
  readonly onProviderApiKeyChange: (providerApiKey: string) => void;
  readonly onProviderBaseUrlChange: (providerBaseUrl: string) => void;
  readonly onProviderModelChange: (providerModel: string) => void;
}

const providerOptions = [
  { value: "openai", label: "OpenAI（官方 Responses）" },
  { value: "deepseek", label: "DeepSeek（兼容 chat/completions）" },
  { value: "doubao", label: "豆包 / Doubao（兼容 chat/completions）" },
  { value: "compatible", label: "兼容端点（VectorEngine / 自定义）" },
  { value: "local", label: "本地回退（开发用）" }
] as const;

export function ProviderSelectionSection({
  activeProvider,
  providerApiKey,
  providerBaseUrl,
  providerModel,
  providerStatus,
  disabled,
  onSelect,
  onProviderApiKeyChange,
  onProviderBaseUrlChange,
  onProviderModelChange
}: ProviderSelectionSectionProps) {
  const [draftProviderApiKey, setDraftProviderApiKey] = useState(providerApiKey);
  const [draftProviderBaseUrl, setDraftProviderBaseUrl] = useState(providerBaseUrl);
  const [draftProviderModel, setDraftProviderModel] = useState(providerModel);
  const usesRemoteProvider = activeProvider !== "local";
  const requiresCustomBaseUrl = providerStatus?.requiresCustomBaseUrl ?? false;
  const requiresCustomModel = providerStatus?.requiresCustomModel ?? false;

  useEffect(() => {
    setDraftProviderApiKey(providerApiKey);
  }, [providerApiKey]);

  useEffect(() => {
    setDraftProviderBaseUrl(providerBaseUrl);
  }, [providerBaseUrl]);

  useEffect(() => {
    setDraftProviderModel(providerModel);
  }, [providerModel]);

  return (
    <OptionsSection title="AI Provider 设置">
      <p className="atti-copy-muted">
        当前支持 OpenAI、DeepSeek、豆包，以及兼容 `chat/completions` 的自定义端点。
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
        <span className="atti-field__label">API key</span>
        <input
          aria-label="API key"
          className="atti-input"
          disabled={disabled || !usesRemoteProvider}
          onBlur={() => {
            if (draftProviderApiKey !== providerApiKey) {
              onProviderApiKeyChange(draftProviderApiKey);
            }
          }}
          onChange={(event) => {
            setDraftProviderApiKey(event.currentTarget.value);
          }}
          placeholder="sk-..."
          type="password"
          value={draftProviderApiKey}
        />
      </label>
      {requiresCustomBaseUrl ? (
        <label className="atti-field">
          <span className="atti-field__label">兼容 API URL</span>
          <input
            aria-label="兼容 API URL"
            className="atti-input"
            disabled={disabled || !usesRemoteProvider}
            onBlur={() => {
              if (draftProviderBaseUrl !== providerBaseUrl) {
                onProviderBaseUrlChange(draftProviderBaseUrl);
              }
            }}
            onChange={(event) => {
              setDraftProviderBaseUrl(event.currentTarget.value);
            }}
            placeholder="https://api.vectorengine.cn/v1/chat/completions"
            type="url"
            value={draftProviderBaseUrl}
          />
        </label>
      ) : null}
      {requiresCustomModel ? (
        <label className="atti-field">
          <span className="atti-field__label">模型名称</span>
          <input
            aria-label="模型名称"
            className="atti-input"
            disabled={disabled || !usesRemoteProvider}
            onBlur={() => {
              if (draftProviderModel !== providerModel) {
                onProviderModelChange(draftProviderModel);
              }
            }}
            onChange={(event) => {
              setDraftProviderModel(event.currentTarget.value);
            }}
            placeholder="deepseek-chat / doubao-1-5-pro-32k / custom-model"
            type="text"
            value={draftProviderModel}
          />
        </label>
      ) : null}
      {!usesRemoteProvider ? (
        <p className="atti-copy-muted">当前是本地回退模式，无需填写远程引擎配置。</p>
      ) : null}
      {providerStatus?.resolvedApiUrl ? (
        <p className="atti-status-text">当前 API URL：{providerStatus.resolvedApiUrl}</p>
      ) : null}
      {providerStatus?.resolvedModel ? (
        <p className="atti-status-text">当前模型：{providerStatus.resolvedModel}</p>
      ) : null}
      <p className="atti-status-text">
        API 密钥状态：
        {" "}
        {providerStatus?.usesRemoteProvider
          ? providerStatus.hasProviderApiKey
            ? "已保存在本地"
            : "缺失"
          : "当前模式无需填写"}
      </p>
    </OptionsSection>
  );
}

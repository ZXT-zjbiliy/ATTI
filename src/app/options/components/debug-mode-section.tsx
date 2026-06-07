import { OptionsSection } from "./options-section";

interface DebugModeSectionProps {
  readonly debugMode: boolean;
  readonly disabled: boolean;
  readonly onToggle: (debugMode: boolean) => void;
}

export function DebugModeSection({ debugMode, disabled, onToggle }: DebugModeSectionProps) {
  return (
    <OptionsSection title="调试模式">
      <p className="atti-copy-muted">仅用于开发和排查问题，不会改变当前产品边界。</p>
      <label className="atti-toggle">
        <span className="atti-field__label">开启调试模式</span>
        <input
          aria-label="开启调试模式"
          checked={debugMode}
          className="atti-checkbox"
          disabled={disabled}
          onChange={(event) => {
            onToggle(event.currentTarget.checked);
          }}
          type="checkbox"
        />
      </label>
    </OptionsSection>
  );
}

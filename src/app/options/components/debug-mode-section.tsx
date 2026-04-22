import { OptionsSection } from "./options-section";

interface DebugModeSectionProps {
  readonly debugMode: boolean;
  readonly disabled: boolean;
  readonly onToggle: (debugMode: boolean) => void;
}

export function DebugModeSection({
  debugMode,
  disabled,
  onToggle,
}: DebugModeSectionProps) {
  return (
    <OptionsSection title="Debug Mode">
      <p>Enable extra diagnostics for extension development and troubleshooting.</p>
      <label>
        <span>Debug mode</span>
        <input
          aria-label="Debug mode"
          checked={debugMode}
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

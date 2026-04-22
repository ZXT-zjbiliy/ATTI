interface ProfileDraftFormProps {
  readonly narrativeSummary: string;
  readonly evidenceText: string;
  readonly disabled: boolean;
  readonly onNarrativeSummaryChange: (narrativeSummary: string) => void;
  readonly onEvidenceTextChange: (evidenceText: string) => void;
  readonly onSubmit: () => void;
}

export function ProfileDraftForm({
  narrativeSummary,
  evidenceText,
  disabled,
  onNarrativeSummaryChange,
  onEvidenceTextChange,
  onSubmit
}: ProfileDraftFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label>
        <span>Profile summary</span>
        <textarea
          aria-label="Profile summary"
          disabled={disabled}
          onChange={(event) => {
            onNarrativeSummaryChange(event.currentTarget.value);
          }}
          rows={4}
          value={narrativeSummary}
        />
      </label>
      <label>
        <span>Evidence notes</span>
        <textarea
          aria-label="Evidence notes"
          disabled={disabled}
          onChange={(event) => {
            onEvidenceTextChange(event.currentTarget.value);
          }}
          rows={4}
          value={evidenceText}
        />
      </label>
      <button disabled={disabled} type="submit">
        Save local profile draft
      </button>
    </form>
  );
}

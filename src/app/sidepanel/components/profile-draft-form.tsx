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
      className="atti-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="atti-field">
        <span className="atti-field__label">画像摘要</span>
        <textarea
          aria-label="画像摘要"
          className="atti-textarea"
          disabled={disabled}
          onChange={(event) => {
            onNarrativeSummaryChange(event.currentTarget.value);
          }}
          rows={4}
          value={narrativeSummary}
        />
      </label>
      <label className="atti-field">
        <span className="atti-field__label">证据备注</span>
        <textarea
          aria-label="证据备注"
          className="atti-textarea"
          disabled={disabled}
          onChange={(event) => {
            onEvidenceTextChange(event.currentTarget.value);
          }}
          rows={4}
          value={evidenceText}
        />
      </label>
      <button className="atti-button" disabled={disabled} type="submit">
        保存本地画像草稿
      </button>
    </form>
  );
}

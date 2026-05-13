import { profilePresetQuestions } from "../../../domain/profile/profile-preset-questionnaire";

interface ProfilePresetQuestionnaireFormProps {
  readonly disabled: boolean;
  readonly selectedAnswers: Record<string, string>;
  readonly onAnswerChange: (questionId: string, selectedOptionId: string) => void;
  readonly onSubmit: () => void;
}

export function ProfilePresetQuestionnaireForm({
  disabled,
  selectedAnswers,
  onAnswerChange,
  onSubmit
}: ProfilePresetQuestionnaireFormProps) {
  const isComplete = profilePresetQuestions.every(
    (question) => selectedAnswers[question.id]?.length > 0
  );

  return (
    <form
      className="atti-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="atti-form__intro">
        <strong>预设画像问卷</strong>
        <span>先选择你的偏好，再由 AI 生成可复用的本地画像。</span>
      </div>
      {profilePresetQuestions.map((question) => (
        <fieldset className="atti-choice-group" disabled={disabled} key={question.id}>
          <legend className="atti-field__label">{question.text}</legend>
          {question.options.map((option) => (
            <label className="atti-choice" key={option.id}>
              <input
                checked={selectedAnswers[question.id] === option.id}
                name={`profile-preset-${question.id}`}
                onChange={() => {
                  onAnswerChange(question.id, option.id);
                }}
                type="radio"
                value={option.id}
              />
              <span>{option.text}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <button className="atti-button" disabled={disabled || !isComplete} type="submit">
        用 AI 生成本地画像
      </button>
    </form>
  );
}

export type ProfilePresetQuestionOption = {
  readonly id: string;
  readonly text: string;
};

export type ProfilePresetQuestion = {
  readonly id: string;
  readonly text: string;
  readonly options: readonly ProfilePresetQuestionOption[];
};

export type ProfilePresetAnswer = {
  readonly questionId: string;
  readonly selectedOptionId: string;
};

export type ProfilePresetAnalysisInput = {
  readonly answers: readonly ProfilePresetAnswer[];
};

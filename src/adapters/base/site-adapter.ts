export interface AdapterMatchContext {
  readonly url: string;
  readonly title?: string;
  readonly html?: string;
}

export interface AdapterPageContext extends AdapterMatchContext {
  readonly html: string;
}

export interface AdapterFillContext extends AdapterMatchContext {
  readonly document: Document;
}

export interface ExtractedQuestionDraft {
  readonly section?: string;
  readonly text: string;
  readonly type: string;
  readonly options: readonly {
    readonly id: string;
    readonly text: string;
    readonly value?: string;
  }[];
  readonly order: number;
}

export interface AdapterCapabilities {
  readonly supportsQuestionExtraction: boolean;
  readonly supportsPreview: boolean;
  readonly supportsFill: boolean;
}

export interface SiteAdapterDescriptor {
  readonly siteId: string;
  readonly displayName: string;
  readonly capabilities: AdapterCapabilities;
}

export interface LocatedQuestionRegion {
  readonly order: number;
  readonly promptText: string;
  readonly locatorHint: string;
}

export interface QuestionRegionLocatorResult {
  readonly isSupportedAssessmentPage: boolean;
  readonly questionRegions: readonly LocatedQuestionRegion[];
}

export interface QuestionExtractionResult {
  readonly questionCount: number;
  readonly questions: readonly ExtractedQuestionDraft[];
}

export interface AnswerFillSelection {
  readonly questionId: string;
  readonly questionText: string;
  readonly questionOrder: number;
  readonly selectedOptionIds: readonly string[];
}

export interface AnswerFillResult {
  readonly filledCount: number;
}

export interface SiteAdapter {
  readonly descriptor: SiteAdapterDescriptor;
  matches: (context: AdapterMatchContext) => boolean;
  isSupportedAssessmentPage?: (context: AdapterPageContext) => boolean;
  locateQuestionRegions?: (
    context: AdapterPageContext,
  ) => QuestionRegionLocatorResult;
  extractQuestions?: (context: AdapterPageContext) => QuestionExtractionResult;
  fillAnswers?: (
    context: AdapterFillContext,
    selections: readonly AnswerFillSelection[],
  ) => AnswerFillResult;
}

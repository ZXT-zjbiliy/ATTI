export type QuestionOption = {
  id: string;
  text: string;
  value?: string;
};

export type Question = {
  id: string;
  sessionId: string;
  siteId: string;
  pageUrl: string;
  section?: string;
  text: string;
  type: string;
  options: QuestionOption[];
  order: number;
  createdAt: string;
};

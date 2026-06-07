import type { ProfilePresetAnalysisInput, ProfilePresetQuestion } from "../../shared/types";

export const PROFILE_PRESET_QUESTIONNAIRE_VERSION = 1;

export const profilePresetQuestions = [
  {
    id: "energy-source",
    text: "你更常从哪里恢复精力？",
    options: [
      { id: "quiet-reflection", text: "独处、整理想法、安静恢复" },
      { id: "close-circle", text: "和熟悉的人小范围交流" },
      { id: "active-social", text: "参与活动、和更多人互动" }
    ]
  },
  {
    id: "decision-style",
    text: "面对重要选择时，你通常优先看什么？",
    options: [
      { id: "principles", text: "原则、长期影响和一致性" },
      { id: "people-impact", text: "对他人感受和关系的影响" },
      { id: "facts-efficiency", text: "事实、效率和可执行性" }
    ]
  },
  {
    id: "work-rhythm",
    text: "你更舒服的工作节奏是？",
    options: [
      { id: "planned-steady", text: "提前规划，稳定推进" },
      { id: "adaptive", text: "保留弹性，边做边调整" },
      { id: "deadline-driven", text: "临近截止时集中爆发" }
    ]
  },
  {
    id: "conflict-response",
    text: "遇到冲突或分歧时，你更容易怎么做？",
    options: [
      { id: "direct-clarify", text: "直接说清问题，尽快解决" },
      { id: "mediate-harmony", text: "先缓和气氛，照顾各方感受" },
      { id: "step-back", text: "先退一步思考，再表达立场" }
    ]
  },
  {
    id: "novelty-preference",
    text: "面对新任务或陌生环境时，你的倾向是？",
    options: [
      { id: "explore-first", text: "先尝试探索，从体验里学习" },
      { id: "research-first", text: "先收集信息，理解规则后再行动" },
      { id: "follow-proven-path", text: "优先参考成熟方法和可靠路径" }
    ]
  },
  {
    id: "feedback-style",
    text: "你更希望别人怎样给你反馈？",
    options: [
      { id: "specific-direct", text: "具体、直接、指出改进点" },
      { id: "balanced-supportive", text: "先肯定价值，再讨论改进" },
      { id: "big-picture", text: "说明整体方向，让我自己细化" }
    ]
  }
] as const satisfies readonly ProfilePresetQuestion[];

export type ResolvedProfilePresetAnswer = {
  readonly questionId: string;
  readonly questionText: string;
  readonly selectedOptionId: string;
  readonly selectedOptionText: string;
};

export function resolveProfilePresetAnswers(
  input: ProfilePresetAnalysisInput
): ResolvedProfilePresetAnswer[] {
  return input.answers.map((answer) => {
    const question = profilePresetQuestions.find((item) => item.id === answer.questionId);
    const option = question?.options.find((item) => item.id === answer.selectedOptionId);

    if (!question || !option) {
      throw new Error(
        `Invalid preset profile answer: ${answer.questionId}/${answer.selectedOptionId}`
      );
    }

    return {
      questionId: question.id,
      questionText: question.text,
      selectedOptionId: option.id,
      selectedOptionText: option.text
    };
  });
}

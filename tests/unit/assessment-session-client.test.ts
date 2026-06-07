import { describe, expect, it } from "vitest";

import { createAssessmentSessionClient } from "../../src/app/sidepanel/services/assessment-session-client";
import type {
  AnswerFillRunMessage,
  AnswerPlanningRunMessage,
  AppResult
} from "../../src/shared/types";

type SupportedAssessmentSessionMessage = AnswerPlanningRunMessage | AnswerFillRunMessage;

describe("assessment session client", () => {
  it("runs answer planning and applies reviewed answers through background messages only", async () => {
    const sendMessage = async (message: SupportedAssessmentSessionMessage): Promise<AppResult> => {
      if (message.type === "answerPlanningRun") {
        return {
          ok: true,
          data: {
            sessionId: message.payload.sessionId,
            answerPlanCount: 2,
            providerId: "fake-assessment-provider"
          }
        };
      }

      return {
        ok: true,
        data: {
          sessionId: message.payload.sessionId,
          filledCount: 2,
          siteId: "truity-enneagram"
        }
      };
    };
    const client = createAssessmentSessionClient(sendMessage);

    const planningResult = await client.runAnswerPlanning("session-1");
    const fillResult = await client.applyReviewedAnswers("session-1");

    expect(planningResult.answerPlanCount).toBe(2);
    expect(fillResult.filledCount).toBe(2);
    expect(fillResult.siteId).toBe("truity-enneagram");
  });
});

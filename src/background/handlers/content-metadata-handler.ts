import type {
  AppResult,
  ContentMetadataReportMessage,
} from "../../shared/types";
import type { BackgroundMessageHandler } from "./types";

export const handleContentMetadataReportMessage: BackgroundMessageHandler<
  ContentMetadataReportMessage
> = async (message): Promise<AppResult> => {
  return {
    ok: true,
    data: {
      received: true,
      pageUrl: message.payload.page.url,
    },
  };
};

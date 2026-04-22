import type { AppResult, PingMessage } from "../../shared/types";
import type { BackgroundHandlerContext, BackgroundMessageHandler } from "./types";

export const handlePingMessage: BackgroundMessageHandler<PingMessage> = async (
  message: PingMessage,
  context: BackgroundHandlerContext
): Promise<AppResult<{ pong: true }>> => {
  void message;
  void context;

  return {
    ok: true,
    data: {
      pong: true
    }
  };
};

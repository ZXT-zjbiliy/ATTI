export type SessionManager = {
  getCurrentSessionId(): string | null;
};

export function createSessionManager(): SessionManager {
  return {
    getCurrentSessionId() {
      return null;
    }
  };
}

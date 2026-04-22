export type AdapterDiagnosticsPayload = Record<string, unknown>;

export type AdapterDiagnostics = {
  id: string;
  sessionId: string;
  siteId: string;
  selectorVersion: string;
  phase: string;
  message: string;
  payload?: AdapterDiagnosticsPayload;
  createdAt: string;
};

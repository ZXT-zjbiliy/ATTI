import { ProviderExecutionError } from "./provider-error";

export type FetchLike = typeof fetch;

export interface ProviderFetchOptions {
  readonly fetchImpl?: FetchLike;
  readonly providerId: string;
  readonly unavailableCode: string;
  readonly unavailableMessage: string;
}

export interface ProviderJsonRequestOptions {
  readonly authFailedCode: string;
  readonly authFailedMessage: string;
  readonly fetchImpl: FetchLike;
  readonly providerId: string;
  readonly requestFailedCode: string;
  readonly requestFailedMessage: (cause: string) => string;
  readonly responseInit: RequestInit;
  readonly responseNotOkCode: string;
  readonly responseNotOkMessage: string;
  readonly url: string;
}

export function resolveProviderFetch(options: ProviderFetchOptions): FetchLike {
  if (options.fetchImpl) {
    return options.fetchImpl;
  }

  if (typeof fetch === "function") {
    return fetch.bind(globalThis);
  }

  throw new ProviderExecutionError({
    providerId: options.providerId,
    code: options.unavailableCode,
    message: options.unavailableMessage,
    retryable: false
  });
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function executeProviderJsonRequest<T>(
  options: ProviderJsonRequestOptions
): Promise<T> {
  let response: Response;

  try {
    response = await options.fetchImpl(options.url, options.responseInit);
  } catch (error) {
    const cause = error instanceof Error ? error.message : "unknown";

    throw new ProviderExecutionError({
      providerId: options.providerId,
      code: options.requestFailedCode,
      message: options.requestFailedMessage(cause),
      retryable: true,
      details: {
        cause
      }
    });
  }

  if (!response.ok) {
    const isAuthFailure = response.status === 401 || response.status === 403;

    throw new ProviderExecutionError({
      providerId: options.providerId,
      code: isAuthFailure ? options.authFailedCode : options.responseNotOkCode,
      message: isAuthFailure ? options.authFailedMessage : options.responseNotOkMessage,
      statusCode: response.status,
      retryable: response.status >= 500,
      details: {
        body: await readErrorBody(response)
      }
    });
  }

  return (await response.json()) as T;
}

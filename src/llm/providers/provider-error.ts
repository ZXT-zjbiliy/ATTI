export interface ProviderExecutionErrorOptions {
  readonly providerId: string;
  readonly code: string;
  readonly message: string;
  readonly statusCode?: number;
  readonly retryable?: boolean;
  readonly details?: Record<string, unknown>;
}

export class ProviderExecutionError extends Error {
  readonly providerId: string;
  readonly code: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(options: ProviderExecutionErrorOptions) {
    super(options.message);
    this.name = "ProviderExecutionError";
    this.providerId = options.providerId;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }

  toJSON() {
    return {
      providerId: this.providerId,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      details: this.details
    };
  }
}

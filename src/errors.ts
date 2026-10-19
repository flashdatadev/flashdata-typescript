export class FlashDataError extends Error {
  constructor(message: string) { super(message); this.name = new.target.name; }
}
export class ValidationError extends FlashDataError {}
export class ProtocolError extends FlashDataError {}
export class ResponseTooLargeError extends ProtocolError {}
export class ConnectionError extends FlashDataError {}
export class RequestTimeoutError extends ConnectionError {}
export class SubmissionUnknownError extends ConnectionError {}
export class APIError extends FlashDataError {
  constructor(public readonly statusCode: number, message: string,
    public readonly code?: string, public readonly requestId?: string,
    public readonly retryAfter?: string, public readonly body?: unknown) { super(message); }
}
export class PollingTimeoutError extends FlashDataError {
  constructor(public readonly jobId: string) { super(`Waiting for ${jobId} timed out; continue reading the same ID.`); }
}
export class JobFailedError extends FlashDataError {
  constructor(public readonly job: Record<string, unknown>) { super(`Job ${job.id} ended with status ${job.status}.`); }
}
export class JobPausedError extends JobFailedError {}

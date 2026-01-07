export class ApiError extends Error {
  public readonly status: number | undefined
  public readonly body: unknown

  constructor(status?: number, body?: unknown, message?: string) {
    super(message ?? `API Error${status ? ` (${status})` : ''}`)
    this.status = status
    this.body = body
    // Set up prototype chain manually for ES5 compatibility
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export class TimeoutError extends ApiError {
  constructor(message = 'Request timed out') {
    super(undefined, undefined, message)
    // Set up prototype chain manually for ES5 compatibility
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}

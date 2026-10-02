import type { Bucket } from './bucket'
import { ApiError, TimeoutError } from './errors'
import type { ClientConfig, Headers, HttpMethod, Request, RequestOptions } from './types'
import { createClientConfig } from './utils'

/** Client for RESTful APIs. */
export class HttpClient {
  private readonly baseUrl: string | undefined
  private readonly defaultHeaders: Headers
  private readonly timeoutMs: number | undefined
  private readonly retries: number
  private readonly bucket: Bucket | undefined

  public constructor(config?: ClientConfig) {
    const cfg = config ?? createClientConfig()
    this.baseUrl = cfg.baseUrl
    this.defaultHeaders = cfg.defaultHeaders
    this.timeoutMs = cfg.timeoutMs
    this.retries = cfg.retries
    this.bucket = cfg.bucket
  }

  public perform<ReqBody, ResBody = unknown>(req: Request<ReqBody>, opts: RequestOptions = {}): Promise<ResBody> {
    // url
    const params = Object.entries(req.params).map(([k, v]) => [k, String(v)])
    const url
      = (this.baseUrl !== undefined ? `${this.baseUrl.replace(/\/$/, '')}/` : '')
        + req.path.replace(/^\//, '')
        + (params.length > 0 ? `?${new URLSearchParams(params)}` : '')
    // headers
    let headers: Headers = { ...this.defaultHeaders, ...req.headers }
    const hasContentType = Object.keys(headers).some(k => k.toLowerCase() === 'content-type')
    if (req.body !== undefined && !hasContentType)
      headers = { ...headers, 'content-type': 'application/json' }
    return this.performAttemptNumber(0, {
      method: req.method,
      url,
      headers,
      body: JSON.stringify(req.body),
      retries: opts.retries ?? this.retries,
      timeoutMs: opts.timeoutMs ?? this.timeoutMs,
      extraBucket: opts.extraBucket,
    })
  }

  private async performAttemptNumber<ResBody>(n: number, { method, url, headers, body, retries, timeoutMs, extraBucket, lastError }: {
    method: HttpMethod
    url: string
    headers: Headers
    body: string
    retries: number
    timeoutMs: number | undefined
    extraBucket: Bucket | undefined
    lastError?: unknown
  }): Promise<ResBody> {
    if (n > retries) {
      // Exceeded maximum number of attempts
      if (lastError instanceof Error)
        throw lastError.name === 'AbortError' ? new TimeoutError() : lastError
      throw new ApiError()
    }
    if (lastError instanceof Error
      && !(lastError instanceof TypeError) // fetch network failure
      && !(lastError instanceof ApiError && lastError.status !== undefined && lastError.status >= 500 && lastError.status < 600)) {
      // Non-retryable error
      throw lastError
    }
    if (n > 0) {
      // Exponential backoff
      const backoffMs = Math.min(1000 * 2 ** (n - 1), 10_000)
      await new Promise(r => setTimeout(r, backoffMs))
    }
    const controller = new AbortController()
    const signal = controller.signal
    const timeoutId = timeoutMs === undefined
      ? undefined
      : setTimeout(() => { controller.abort() }, timeoutMs)
    let newError: unknown
    try {
      await Promise.all([this.bucket?.removeToken(), extraBucket?.removeToken()])
      const resp = await fetch(url, {
        method,
        headers,
        body,
        signal,
      })
      const text = await resp.text()
      if (!resp.ok)
        throw new ApiError(resp.status, text)
      const contentType = resp.headers.get('content-type')?.toLowerCase() ?? '' // Web APIs `Headers.get` is case-insensitive
      if (contentType.includes('application/json')) {
        try {
          return JSON.parse(text) as ResBody
        }
        catch {
          throw new ApiError(resp.status, text, 'Failed to parse JSON response')
        }
      }
      // Return raw text for non-json
      return text as unknown as ResBody
    }
    catch (error) {
      newError = error
    }
    finally {
      if (timeoutId !== undefined)
        clearTimeout(timeoutId)
    }
    // Make a new attempt if an error occurred
    return this.performAttemptNumber(n + 1, {
      method,
      url,
      headers,
      body,
      retries,
      timeoutMs,
      extraBucket,
      lastError: newError,
    })
  }
}

import type { Bucket } from './bucket'
import { ApiError, TimeoutError } from './errors'
import type { ClientConfig, Headers, Request, RequestOptions } from './types'
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

  public async perform<ReqBody, ResBody = unknown>(req: Request<ReqBody>, opts: RequestOptions = {}): Promise<ResBody | undefined> {
    const method = req.method
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
    // body
    const body = JSON.stringify(req.body)
    // options
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs
    const retries = opts.retries ?? this.retries

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController()
      const signal = controller.signal
      const timeoutId = timeoutMs === undefined
        ? undefined
        : setTimeout(() => { controller.abort() }, timeoutMs)
      try {
        await this.bucket?.removeToken()
        const resp = await fetch(url, {
          method,
          headers,
          body,
          signal,
        })
        const text = await resp.text()

        // handle non-2xx
        if (!resp.ok)
          throw new ApiError(resp.status, text)

        // read empty body or 204
        if (text.length === 0)
          return undefined

        const contentType = resp.headers.get('content-type')?.toLowerCase() ?? '' // Web APIs `Headers.get` is case-insensitive
        if (contentType.includes('application/json')) {
          try {
            return JSON.parse(text) as ResBody
          }
          catch {
            throw new ApiError(resp.status, text, 'Failed to parse JSON response')
          }
        }
        // return raw text for non-json
        return text as unknown as ResBody
      }
      catch (err) {
        const wasLastAttempt = attempt === retries

        const isAbort = err instanceof Error && err.name === 'AbortError'
        if (wasLastAttempt && isAbort)
          // treat as timeout
          throw new TimeoutError()

        // for network errors or 5xx, retry up to retries
        const isRetryable
          = err instanceof TypeError // fetch network failure
            || (err instanceof ApiError && err.status !== undefined && err.status >= 500 && err.status < 600)

        if (wasLastAttempt || !isRetryable)
          throw err

        // exponential backoff
        const backoffMs = Math.min(1000 * 2 ** attempt, 10_000)
        await new Promise(r => setTimeout(r, backoffMs))
      }
      finally {
        if (timeoutId !== undefined)
          clearTimeout(timeoutId)
      }
    }
  }
}

import type { ClientConfig, Headers, HttpMethod, QueryParams, Request } from './types'

// MARK: - Request factory

export const REQUEST_DEFAULTS = {
  method: 'GET' as HttpMethod,
  headers: {} as Headers,
  params: {} as QueryParams,
} as const

/** @see {@link REQUEST_DEFAULTS} */
export function createRequest(req: {
  path: string
  method?: HttpMethod
  headers?: Headers
  params?: QueryParams
}): Request<undefined>
export function createRequest<Body>(req: {
  path: string
  method?: HttpMethod
  headers?: Headers
  params?: QueryParams
  body: Body
}): Request<Body>
export function createRequest<Body>(req: {
  path: string
  method?: HttpMethod
  headers?: Headers
  params?: QueryParams
  body?: Body
}): Request<Body> {
  const {
    path,
    method = REQUEST_DEFAULTS.method,
    headers = REQUEST_DEFAULTS.headers,
    params = REQUEST_DEFAULTS.params,
    body,
  } = req
  return {
    path,
    method,
    headers,
    params,
    body: body as Body, // overloads ensure correct typing
  }
}

// MARK: - ClientConfig factory

export const CLIENT_CONFIG_DEFAULTS = {
  defaultHeaders: {} as Headers,
  retries: 0,
} as const

/** @see {@link CLIENT_CONFIG_DEFAULTS} */
export function createClientConfig(cfg: Partial<ClientConfig> = {}): ClientConfig {
  const {
    baseUrl,
    defaultHeaders = CLIENT_CONFIG_DEFAULTS.defaultHeaders,
    timeoutMs,
    retries = CLIENT_CONFIG_DEFAULTS.retries,
  } = cfg
  return {
    ...(baseUrl === undefined ? {} : { baseUrl }),
    defaultHeaders,
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    retries,
  }
}

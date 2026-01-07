export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'

export type Headers = Readonly<Record<string, string>>

export type QueryParams = Readonly<Record<string, string | number | boolean>>

export type Request<Body> = Readonly<{
  path: string
  method: HttpMethod
  headers: Headers
  params: QueryParams
  body: Body
}>

export type RequestOptions = Readonly<Partial<{
  timeoutMs: number
  retries: number
}>>

export type ClientConfig = Readonly<{
  baseUrl?: string
  defaultHeaders: Headers
  timeoutMs?: number
  retries: number
}>

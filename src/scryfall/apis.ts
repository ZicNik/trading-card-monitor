import { createClientConfig, createRequest, HttpClient } from '@/http'
import type { ScryfallCard } from './types'

export type ScryfallApisConfig = Partial<Readonly<{
  timeoutMs: number
  retries: number
}>>

/** @see {@link https://scryfall.com/docs/api} */
export class ScryfallApis {
  private readonly http: HttpClient

  constructor(config?: ScryfallApisConfig) {
    this.http = new HttpClient(createClientConfig({
      baseUrl: 'https://api.scryfall.com',
      ...(config?.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
      ...(config?.retries !== undefined ? { retries: config.retries } : {}),
    }))
  }

  /** @see {@link https://scryfall.com/docs/api/cards/search} */
  async cardsSearch(q: string, unique?: 'cards' | 'art' | 'prints' | 'sets'): Promise<{ data: ScryfallCard[] } | undefined> {
    return await this.http.perform(createRequest({
      path: '/cards/search',
      params: {
        q,
        ...(unique !== undefined ? { unique } : {}),
      },
    }))
  }

  /** @see {@link https://scryfall.com/docs/api/cards/named} */
  async cardsNamed(exact?: string, fuzzy?: string): Promise<ScryfallCard | undefined> {
    return await this.http.perform(createRequest({
      path: '/cards/named',
      params: {
        ...(exact !== undefined ? { exact } : {}),
        ...(fuzzy !== undefined ? { fuzzy } : {}),
      },
    }))
  }
}

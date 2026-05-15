import { APP_CONFIG } from '@/config/app-config'
import { createClientConfig, createRequest, HttpClient } from '@/http'
import type { CardTraderBlueprint, CardTraderExpansion, CardTraderProduct } from './types'

export type CardTraderApisConfig = Partial<Readonly<{
  timeoutMs: number
  retries: number
}>>

/** @see {@link https://www.cardtrader.com/en/docs/api/full/reference} */
export class CardTraderApis {
  private readonly http: HttpClient

  constructor(config?: CardTraderApisConfig) {
    this.http = new HttpClient(createClientConfig({
      baseUrl: 'https://api.cardtrader.com/api/v2',
      defaultHeaders: { Authorization: `Bearer ${APP_CONFIG.cardtraderToken}` },
      ...(config?.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
      ...(config?.retries !== undefined ? { retries: config.retries } : {}),
    }))
  }

  /** @see {@link https://www.cardtrader.com/en/docs/api/full/reference#expansions} */
  async expansions(): Promise<CardTraderExpansion[] | undefined> {
    return await this.http.perform(createRequest({ path: '/expansions' }))
  }

  /** @see {@link https://www.cardtrader.com/en/docs/api/full/reference#blueprints} */
  async blueprints(expansion_id: number): Promise<CardTraderBlueprint[] | undefined> {
    return await this.http.perform(createRequest({
      path: '/blueprints',
      params: { expansion_id },
    }))
  }

  /** @see {@link https://www.cardtrader.com/en/docs/api/full/reference#marketplace-products} */
  async marketplaceProducts(expansion_id?: number, blueprint_id?: number): Promise<CardTraderProduct[] | undefined> {
    return await this.http.perform(createRequest({
      path: '/marketplace/products',
      params: {
        ...(expansion_id !== undefined ? { expansion_id } : {}),
        ...(blueprint_id !== undefined ? { blueprint_id } : {}),
      },
    }))
  }
}

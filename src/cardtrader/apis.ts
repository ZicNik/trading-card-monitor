import { APP_CONFIG } from '@/config/app-config'
import { createClientConfig, createRequest, HttpClient, type ThrottlingConfig } from '@/http'
import { CT_MTG_GAME_ID, type CardTraderBlueprint, type CardTraderExpansion, type CardTraderLanguage, type CardTraderProduct } from './types'

/** @see {@link APIS_DEFAULTS} */
export type CardTraderApisConfig = Readonly<{
  timeoutMs: number
  retries: number
  throttling: ThrottlingConfig
}>

export const APIS_DEFAULTS = {
  timeoutMs: 30_000,
  retries: 2,
  throttling: { tokensPerInterval: 70, intervalMs: 5000 },
} as const

/** @see {@link https://www.cardtrader.com/en/docs/api/full/reference} */
export class CardTraderApis {
  private readonly http: HttpClient

  constructor(config?: Partial<CardTraderApisConfig>) {
    this.http = new HttpClient(createClientConfig({
      baseUrl: 'https://api.cardtrader.com/api/v2',
      defaultHeaders: { Authorization: `Bearer ${APP_CONFIG.cardtraderToken}` },
      ...APIS_DEFAULTS,
      ...config,
    }))
  }

  /** @see {@link https://www.cardtrader.com/en/docs/api/full/reference#expansions} */
  async expansions(): Promise<CardTraderExpansion[] | undefined> {
    return (await this.http.perform<undefined, CardTraderExpansion[]>(createRequest({ path: '/expansions' })))
      ?.filter(e => e.game_id === CT_MTG_GAME_ID)
  }

  /** @see {@link https://www.cardtrader.com/en/docs/api/full/reference#blueprints} */
  async blueprints(expansion_id: number): Promise<CardTraderBlueprint[] | undefined> {
    return await this.http.perform(createRequest({
      path: '/blueprints/export',
      params: { expansion_id },
    }))
  }

  /** @see {@link https://www.cardtrader.com/en/docs/api/full/reference#marketplace-products} */
  async marketplaceProducts(params: MarketplaceProductsParams): Promise<Record<number, CardTraderProduct[]> | undefined> {
    return await this.http.perform(createRequest({ path: '/marketplace/products', params }))
  }
}

// MARK: - Parameter Types

type MarketplaceProductsParams = Readonly<(
  { expansion_id: number } | { blueprint_id: number }
) & {
  foil?: boolean
  language?: CardTraderLanguage
}>

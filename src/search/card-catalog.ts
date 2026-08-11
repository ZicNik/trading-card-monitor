import type { Card, MarketType } from '@/core'
import type { CardPrototype } from './card-prototype'

/** Main gateway for consulting card data. */
export class CardCatalog {
  private readonly fuzzySearcher: CardFuzzySearcher
  private readonly noMarketFetcher: CardFetcher
  private readonly marketFetchers: Record<MarketType, CardFetcher>

  constructor(args: {
    fuzzySearcher: CardFuzzySearcher
    noMarketFetcher: CardFetcher
    marketFetchers: Record<MarketType, CardFetcher>
  }) {
    this.fuzzySearcher = args.fuzzySearcher
    this.noMarketFetcher = args.noMarketFetcher
    this.marketFetchers = args.marketFetchers
  }

  /** Fuzzy-match (i.e., handling misspellings, typos, and partial words) a card name, returning a simplified view. */
  async fuzzySearch(name: string): Promise<CardPrototype | undefined> {
    return this.fuzzySearcher.fuzzySearch(name)
  }

  /** Retrieve a card's detailed information by its exact name.
   *
   * The `market` parameter is there because different markets may map the same conceptual
   * card differently. If omitted, the result is independent from all markets.
  */
  async getCard(name: string, market?: MarketType): Promise<Card | undefined> {
    return market === undefined
      ? await this.noMarketFetcher.getCard(name)
      : await this.marketFetchers[market].getCard(name)
  }
}

/** Fuzzy-match (i.e., handling misspellings, typos, and partial words) a card name, returning a simplified view. */
export interface CardFuzzySearcher {
  fuzzySearch(name: string): Promise<CardPrototype | undefined>
}

/** Retrieve a card's detailed information by its exact name. */
export interface CardFetcher {
  getCard(name: string): Promise<Card | undefined>
}

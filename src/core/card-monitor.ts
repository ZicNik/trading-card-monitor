import { CardPrinting } from './card'
import type { CardListing } from './card-listing'
import type { MarketType, MonitorMarketFilters } from './market'

/** A card to be monitored according to a set of parameters. */
export class CardMonitor<M extends MarketType = MarketType> {
  constructor(
    public readonly id: number,
    public readonly userId: string,
    public readonly cardName: string,
    public baseFilters: MonitorBaseFilters,
    public marketFilters: MonitorMarketFilters<M>,
  ) {}

  match(listings: CardListing[], marketMatcher: MarketFiltersMatcher): CardMonitorMatch[] {
    return listings
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      .filter(listing => listing.marketDetails.market === this.marketFilters.market
        && this.matchBase(listing)
        && marketMatcher.match(listing, this.marketFilters))
      .map(listing => ({ monitorId: this.id, listingId: listing.id }))
  }

  private readonly matchBase = (listing: CardListing): boolean => {
    return this.baseFilters.printings.some(p => CardPrinting.equals(p, listing.baseAttributes.printing))
      && listing.baseAttributes.euroCents <= this.baseFilters.maxEuroCents
      && (this.baseFilters.foil === undefined || listing.baseAttributes.foil === this.baseFilters.foil)
  }
}

/** Base filtering parameters. Listings that **don't** match them will be ignored. */
export type MonitorBaseFilters = Readonly<{
  printings: readonly CardPrinting[]
  maxEuroCents: number
  foil?: boolean
  // minCondition?: undefined
  // language?: string
  // sellerCountry?: string
}>

export type CardMonitorMatch = Readonly<{
  monitorId: number
  listingId: number
}>

// MARK: - Market Filters Evaluator

/** Evaluates if a listing matches some market filters, for a concrete market. */
export interface SingleMarketFiltersMatcher<M extends MarketType> {
  match(listing: CardListing<M>, filters: MonitorMarketFilters<M>): boolean
}

type MatchersMap = { [M in MarketType]: SingleMarketFiltersMatcher<M> }

/** Evaluates if a listing matches some market filters, for all markets. */
export class MarketFiltersMatcher {
  constructor(private readonly matchers: MatchersMap) {}

  match<M extends MarketType>(listing: CardListing<M>, filters: MonitorMarketFilters<M>): boolean {
    return (this.matchers[filters.market] as SingleMarketFiltersMatcher<M>).match(listing, filters)
  }
}

// MARK: - Repository

export type CardMonitorCreationArgs<M extends MarketType = MarketType> = Readonly<{
  userId: string
  cardName: string
  baseFilters: MonitorBaseFilters
  marketFilters: MonitorMarketFilters<M>
}>

export interface CardMonitorRepository {
  findById(id: number): Promise<CardMonitor | undefined>
  findByUserId(userId: string): Promise<CardMonitor[]>
  getAll(): Promise<CardMonitor[]>
  createAndSave<T extends MarketType = MarketType>(args: CardMonitorCreationArgs<T>): Promise<CardMonitor<T>>
  delete(id: number): Promise<void>
}

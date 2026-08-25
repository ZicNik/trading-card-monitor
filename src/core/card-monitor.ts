import { ValueObject } from '@/common/utilities'
import { CardPrinting, type CardPrintingProps } from './card'
import type { CardListing, ListingBaseAttributes } from './card-listing'
import type { MarketType, MonitorMarketFilters, MonitorMarketFiltersProps } from './market'

/** A card to be monitored according to a set of parameters. */
export class CardMonitor<M extends MarketType = MarketType> {
  constructor(
    public readonly id: number,
    public readonly userId: string,
    public readonly cardName: string,
    public baseFilters: MonitorBaseFilters,
    public marketFilters: MonitorMarketFilters<M>,
  ) {}

  /** @return A `CardMonitorMatched` event if matches were found; `undefined` otherwise. */
  match(listings: CardListing[]): CardMonitorMatched | undefined {
    const matches = listings
      .filter(listing =>
        this.marketFilters.isMatchedBy(listing.marketDetails)
        && this.baseFilters.isMatchedBy(listing.baseAttributes))
    return matches.length !== 0
      ? new CardMonitorMatched(this.id, matches.map(l => l.id))
      : undefined
  }
}

/** Base filtering parameters. Listings that **don't** match them will be ignored. */
export class MonitorBaseFilters extends ValueObject<MonitorBaseFiltersProps> {
  readonly printings: readonly CardPrinting[]
  get maxEuroCents() { return this.props.maxEuroCents }
  get foil() { return this.props.foil }

  constructor(props: MonitorBaseFiltersProps) {
    super(props)
    this.printings = props.printings.map(p => new CardPrinting(p))
  }

  isMatchedBy(attributes: ListingBaseAttributes): boolean {
    return this.printings.some(p => p.isEqual(attributes.printing))
      && attributes.euroCents <= this.maxEuroCents
      && (this.foil === undefined || attributes.foil === this.foil)
  }
}

/** @see {@link MonitorBaseFilters} */
export type MonitorBaseFiltersProps = Readonly<{
  printings: readonly CardPrintingProps[]
  maxEuroCents: number
  foil?: boolean
  // minCondition?: undefined
  // language?: string
  // sellerCountry?: string
}>

/** Event representing that matches were found between a card monitor and *at least one* listing. */
export class CardMonitorMatched {
  readonly type = 'cardMonitorMatched'

  constructor(
    readonly monitorId: number,
    readonly listingIds: readonly number[],
  ) {
    if (this.listingIds.length === 0)
      throw new Error(`CardMonitorMatched with empty listings is not allowed (monitor id: ${this.monitorId})`)
  }
}

// MARK: - Repository

export type CardMonitorCreationArgs<M extends MarketType = MarketType> = Readonly<{
  userId: string
  cardName: string
  baseFilters: MonitorBaseFiltersProps
  marketFilters: MonitorMarketFiltersProps<M>
}>

export interface CardMonitorRepository {
  findById(id: number): Promise<CardMonitor | undefined>
  findByUserId(userId: string): Promise<CardMonitor[]>
  getAll(): Promise<CardMonitor[]>
  createAndSave<T extends MarketType = MarketType>(args: CardMonitorCreationArgs<T>): Promise<CardMonitor<T>>
  delete(id: number): Promise<void>
}

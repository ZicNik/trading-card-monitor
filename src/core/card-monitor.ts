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

  match(listings: CardListing[]): CardMonitorMatch[] {
    return listings
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      .filter(listing => listing.marketDetails.market === this.marketFilters.market
        && this.baseFilters.isMatchedBy(listing.baseAttributes)
        && this.marketFilters.isMatchedBy(listing.marketDetails))
      .map(listing => ({ monitorId: this.id, listingId: listing.id }))
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

export type CardMonitorMatch = Readonly<{
  monitorId: number
  listingId: number
}>

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

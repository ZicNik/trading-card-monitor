import type { CardPrinting } from './card'
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
}

/** Base filtering parameters. Listings that **don't** match them will be ignored. */
export type MonitorBaseFilters = Readonly<{
  printings: CardPrinting[]
  maxEuroCents: number
  foil?: boolean
  // minCondition?: undefined
  // language?: string
  // sellerCountry?: string
}>

// MARK: - Repository

export type CardMonitorCreationArgs<T extends MarketType = MarketType> = Omit<CardMonitor<T>, 'id'>

export interface CardMonitorRepository {
  findById(id: number): Promise<CardMonitor | undefined>
  findByUserId(userId: string): Promise<CardMonitor[]>
  getAll(): Promise<CardMonitor[]>
  createAndSave<T extends MarketType = MarketType>(args: CardMonitorCreationArgs<T>): Promise<CardMonitor<T>>
  delete(id: number): Promise<void>
}

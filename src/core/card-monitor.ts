import type { CardPrinting } from './card'
import type { MarketType, MonitorMarketFilters } from './market'

/** A card to be monitored according to a set of parameters. */
export class CardMonitor {
  constructor(
    public readonly id: number,
    public readonly userId: string,
    public readonly cardName: string,
    public baseFilters: MonitorBaseFilters,
    public targetMarkets: MarketType[],
    public marketFilters: { [M in MarketType]?: MonitorMarketFilters<M> },
  ) {}
}

/** Base filtering parameters. Listings that **don't** match them will be ignored. */
export type MonitorBaseFilters = Readonly<{
  maxEuroCents: number
  foil?: boolean
  printings?: CardPrinting[]
  // minCondition?: undefined
  // language?: string
  // sellerCountry?: string
}>

// MARK: - Repository

export type CardMonitorCreationArgs = Omit<CardMonitor, 'id'>

export interface CardMonitorRepository {
  findById(id: number): Promise<CardMonitor | undefined>
  findByUserId(userId: string): Promise<CardMonitor[]>
  getAll(): Promise<CardMonitor[]>
  createAndSave(args: CardMonitorCreationArgs): Promise<CardMonitor>
  delete(id: number): Promise<void>
}

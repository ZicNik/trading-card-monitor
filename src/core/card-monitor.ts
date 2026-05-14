import type { CardPrinting } from './card'
import type { MonitorMarketFilters } from './market'

/** A card to be monitored according to a set of parameters. */
export class CardMonitor {
  constructor(
    public readonly id: number,
    public readonly cardId: string,
    public readonly userId: string,
    public baseFilters: MonitorBaseFilters,
    public marketFilters: MonitorMarketFilters,
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

export interface CardMonitorRepository {
  findById(id: number): Promise<CardMonitor | undefined>
  findByUserId(userId: string): Promise<CardMonitor[]>
  getAll(): Promise<CardMonitor[]>
  save(cardMonitor: CardMonitor): Promise<void>
  delete(id: number): Promise<void>
}

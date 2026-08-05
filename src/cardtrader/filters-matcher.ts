import type { CardListing, MonitorMarketFilters, SingleMarketFiltersMatcher } from '@/core'

export class CardTraderFiltersMatcher implements SingleMarketFiltersMatcher<'cardtrader'> {
  match(listing: CardListing<'cardtrader'>, filters: MonitorMarketFilters<'cardtrader'>): boolean {
    return filters.ctZero === undefined || listing.marketDetails.ctZero === filters.ctZero
  }
}

declare module '@/core' {
  interface MarketRegistry {
    CardTrader: {
      listingAttributes: CardTraderListingAttributes
      monitorFilters: CardTraderMonitorFilters
    }
  }
}

export type CardTraderListingAttributes = Readonly<{
  ctZero: boolean
}>

export type CardTraderMonitorFilters = Readonly<{
  ctZero?: boolean
}>

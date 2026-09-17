import type { MarketType } from '@/core'

export function formatEuroCents(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' })
    .format(cents / 100)
}

export function formatMarket(market: MarketType): string {
  switch (market) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case 'cardtrader': return 'CardTrader'
  }
}
export function formatDate(date: Temporal.PlainDate): string {
  return date.toLocaleString('en-GB', { month: 'long', day: 'numeric' })
}

import { conditionToCardTraderCondition } from '@/cardtrader'
import type { CardCondition, MarketType } from '@/core'

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

export function formatCondition(condition: CardCondition, market: MarketType): string {
  switch (market) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case 'cardtrader': return conditionToCardTraderCondition(condition)
  }
}

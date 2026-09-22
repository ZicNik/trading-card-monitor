import { CardCondition, CardListing, CardPrinting } from '@/core'

import type { CardTraderCondition, CardTraderProduct } from './types'

export function urlFromBlueprintId(id: number): string {
  return `https://www.cardtrader.com/cards/${id}`
}

export function cardtraderConditionToCardCondition(condition: CardTraderCondition): CardCondition {
  switch (condition) {
    case 'Mint':
    case 'Near Mint':
      return 'near-mint'
    case 'Slightly Played':
    case 'Moderately Played':
      return 'played'
    case 'Played':
    case 'Poor':
      return 'poor'
  }
}

export function conditionToCardTraderCondition(condition: CardCondition): CardTraderCondition {
  switch (condition) {
    case 'near-mint': return 'Near Mint'
    case 'played': return 'Moderately Played'
    case 'poor':return 'Poor'
  }
}

export function cardtraderProductToCardListing(cardName: string, product: CardTraderProduct): CardListing<'cardtrader'> {
  return new CardListing(
    product.id,
    {
      name: cardName,
      euroCents: product.price.cents,
      condition: cardtraderConditionToCardCondition(product.properties_hash.condition),
      language: product.properties_hash.mtg_language,
      foil: product.properties_hash.mtg_foil,
      printing: new CardPrinting({
        setName: product.expansion.name_en,
        setCode: product.expansion.code,
        collectorNum: product.properties_hash.collector_number,
        url: urlFromBlueprintId(product.blueprint_id),
      }),
      seller: product.user.username,
    },
    {
      market: 'cardtrader',
      ctZero: product.user.can_sell_via_hub,
    },
  )
}

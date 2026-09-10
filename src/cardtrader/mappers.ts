import { CardListing, CardPrinting } from '@/core'

import type { CardTraderProduct } from './types'

export function urlFromBlueprintId(id: number): string {
  return `https://www.cardtrader.com/cards/${id}`
}

export function cardtraderProductToCardListing(cardName: string, product: CardTraderProduct): CardListing<'cardtrader'> {
  return new CardListing(
    product.id,
    {
      name: cardName,
      euroCents: product.price.cents,
      condition: (() => {
        switch (product.properties_hash.condition) {
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
      })(),
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

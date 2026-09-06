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
      foil: product.properties_hash.mtg_foil,
      printing: new CardPrinting({
        setName: product.expansion.name_en,
        setCode: product.expansion.code,
        collectorNum: product.properties_hash.collector_number,
        url: urlFromBlueprintId(product.blueprint_id),
      }),
      url: urlFromBlueprintId(product.blueprint_id),
    },
    {
      market: 'cardtrader',
      ctZero: product.user.can_sell_via_hub,
    },
  )
}

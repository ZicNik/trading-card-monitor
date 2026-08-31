import { CardListing, CardPrinting, type CardListingCatalog } from '@/core'
import { DRIZZLE_DB } from '@/drizzle/db'
import { cardtraderBlueprintsTable } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import type { CardTraderApis } from './apis'
import type { CardTraderProduct } from './types'

export class CardTraderListingCatalog implements CardListingCatalog {
  constructor(private readonly apis: CardTraderApis) {}

  async findByCardName(name: string): Promise<CardListing<'cardtrader'>[]> {
    const blueprints = await DRIZZLE_DB.select()
      .from(cardtraderBlueprintsTable)
      .where(eq(cardtraderBlueprintsTable.name, name))
    return (await Promise.all(blueprints.map(async b => [b.id, await this.apis.marketplaceProducts({ blueprint_id: b.id })] as const)))
      .flatMap(([id, products]) => products?.[id]?.map(p => toCardListing(name, p)) ?? [])
  }
}

// MARK: - Mappers

const baseUrl = 'https://www.cardtrader.com/cards'

function toCardListing(cardName: string, product: CardTraderProduct): CardListing<'cardtrader'> {
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
      }),
      url: `${baseUrl}/${product.blueprint_id}`,
    },
    {
      market: 'cardtrader',
      ctZero: product.user.can_sell_via_hub,
    },
  )
}

import { eq } from 'drizzle-orm'

import { CardListing, type CardListingCatalog } from '@/core'
import { DRIZZLE_DB } from '@/drizzle/db'
import { cardtraderBlueprintsTable } from '@/drizzle/schema'
import { normalizeSearchKey } from '@/drizzle/utils'

import type { CardTraderApis } from './apis'
import { cardtraderProductToCardListing } from './mappers'

export class CardTraderListingCatalog implements CardListingCatalog {
  constructor(private readonly apis: CardTraderApis) {}

  async findByCardName(name: string): Promise<CardListing<'cardtrader'>[]> {
    const blueprints = await DRIZZLE_DB.select()
      .from(cardtraderBlueprintsTable)
      .where(eq(cardtraderBlueprintsTable.normalized_name, normalizeSearchKey(name)))
    const cardName = blueprints[0]?.name
    return cardName !== undefined
      ? (await Promise.all(blueprints.map(async b => [b.id, await this.apis.marketplaceProducts({ blueprint_id: b.id })] as const)))
          .flatMap(([id, products]) => products?.[id]?.map(p => cardtraderProductToCardListing(cardName, p)) ?? [])
      : []
  }
}

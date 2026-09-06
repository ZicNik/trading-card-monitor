import { eq } from 'drizzle-orm'

import { Card, CardPrinting } from '@/core'
import { DRIZZLE_DB } from '@/drizzle/db'
import { cardtraderBlueprintsTable, cardtraderSetsTable } from '@/drizzle/schema'
import type { CardFetcher } from '@/search'

import { urlFromBlueprintId } from './mappers'

export class CardTraderCardFetcher implements CardFetcher {
  async getCard(name: string): Promise<Card | undefined> {
    const dbPrintings = await DRIZZLE_DB
      .select({
        blueprintId: cardtraderBlueprintsTable.id,
        collectorNum: cardtraderBlueprintsTable.coll_num,
        setName: cardtraderSetsTable.name,
        setCode: cardtraderSetsTable.code,
      })
      .from(cardtraderBlueprintsTable)
      .where(eq(cardtraderBlueprintsTable.name, name))
      .innerJoin(cardtraderSetsTable, eq(cardtraderBlueprintsTable.expansion_id, cardtraderSetsTable.id))
    return dbPrintings.length === 0
      ? undefined
      : new Card({ name, printings: dbPrintings.map(selectToCardPrinting) })
  }
}

// MARK: - Mappers

function selectToCardPrinting(item: {
  blueprintId: number
  setName: string
  setCode: string
  collectorNum: string
}): CardPrinting {
  return new CardPrinting({
    setName: item.setName,
    setCode: item.setCode,
    collectorNum: item.collectorNum,
    url: urlFromBlueprintId(item.blueprintId),
  })
}

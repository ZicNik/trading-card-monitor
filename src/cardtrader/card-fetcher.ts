import { Card, CardPrinting } from '@/core'
import { DRIZZLE_DB } from '@/drizzle/db'
import { cardtraderBlueprintsTable, cardtraderSetsTable } from '@/drizzle/schema'
import type { CardFetcher } from '@/search'
import { eq } from 'drizzle-orm'

export class CardTraderCardFetcher implements CardFetcher {
  async getCard(name: string): Promise<Card | undefined> {
    const dbPrintings = await DRIZZLE_DB
      .select({
        setName: cardtraderSetsTable.name,
        setCode: cardtraderSetsTable.code,
        collectorNum: cardtraderBlueprintsTable.coll_num,
      })
      .from(cardtraderBlueprintsTable)
      .where(eq(cardtraderBlueprintsTable.name, name))
      .innerJoin(cardtraderSetsTable, eq(cardtraderBlueprintsTable.expansion_id, cardtraderSetsTable.id))
    return dbPrintings.length === 0
      ? undefined
      : new Card({ name, printings: dbPrintings.map(p => new CardPrinting(p)) })
  }
}

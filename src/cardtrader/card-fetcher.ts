import type { Card } from '@/core'
import { DRIZZLE_DB } from '@/drizzle/db'
import { cardtraderBlueprintsTable, cardtraderSetsTable } from '@/drizzle/schema'
import type { CardFetcher } from '@/search'
import { eq } from 'drizzle-orm'

export class CardTraderCardFetcher implements CardFetcher {
  async getCard(name: string): Promise<Card | undefined> {
    const printings = await DRIZZLE_DB
      .select({
        setCode: cardtraderSetsTable.code,
        collectorNum: cardtraderBlueprintsTable.coll_num,
      })
      .from(cardtraderBlueprintsTable)
      .where(eq(cardtraderBlueprintsTable.name, name))
      .innerJoin(cardtraderSetsTable, eq(cardtraderBlueprintsTable.expansion_id, cardtraderSetsTable.id))
    return printings.length === 0 ? undefined : { name, printings }
  }
}

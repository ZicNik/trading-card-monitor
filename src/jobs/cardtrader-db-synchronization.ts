import type { CardTraderApis, CardTraderBlueprint, CardTraderExpansion } from '@/cardtrader'
import { DRIZZLE_DB } from '@/drizzle/db'
import { cardtraderBlueprintsTable, cardtraderSetsTable } from '@/drizzle/schema'
import { normalizeSearchKey } from '@/drizzle/utils'

import { sql } from 'drizzle-orm'
import nodeCron from 'node-cron'

/** Launches a cron job that periodically synchronizes required data from CardTrader to the application database.
 *
 * @see {@link CardTraderDbSynchronizer}
 */
export function startCardTraderDbSynchronization(
  dependencies: { apis: CardTraderApis },
  config?: Partial<CardTraderDbSynchronizerConfig>,
): void {
  const synchonizer = new CardTraderDbSynchronizer({
    apis: dependencies.apis,
    ...(config !== undefined ? { config } : {}),
  })
  const task = nodeCron.schedule('5 0 3-31/3 * *', async () => {
    console.log('Starting CardTrader sets and blueprints synchronization')
    const start = Date.now()
    await synchonizer.syncSetsAndBlueprints()
    const seconds = (Date.now() - start) / 1000
    console.log(`Finished CardTrader sets and blueprints synchronization in ${seconds}s`)
  })
  void task.execute()
}

/** @see {@link SYNCHRONIZER_DEFAULTS} */
export type CardTraderDbSynchronizerConfig = Readonly<{
  httpBatchSize: number
  dbBatchSize: number
}>

export const SYNCHRONIZER_DEFAULTS = {
  httpBatchSize: 5,
  dbBatchSize: 100,
} as const

/** Synchronizes data from CardTrader to the application database. */
export class CardTraderDbSynchronizer {
  private readonly apis: CardTraderApis
  private readonly config: CardTraderDbSynchronizerConfig

  constructor(args: {
    apis: CardTraderApis
    config?: Partial<CardTraderDbSynchronizerConfig>
  }) {
    this.apis = args.apis
    this.config = { ...SYNCHRONIZER_DEFAULTS, ...args.config }
  }

  /** Loads or updates the application's set and blueprint tables with the latest data from CardTrader. */
  async syncSetsAndBlueprints(): Promise<void> {
    const setIds = await this.syncSets()
    await this.syncBlueprintsForSets(setIds)
  }

  /** @returns Set ids */
  private async syncSets(): Promise<number[]> {
    const expansions = (await this.apis.expansions())
      .map(cardTraderExpansionToInsertSet)
    if (expansions.length === 0)
      return []
    await DRIZZLE_DB.insert(cardtraderSetsTable)
      .values(expansions)
      .onConflictDoUpdate({
        target: cardtraderSetsTable.id,
        set: { code: sql`EXCLUDED.code`, name: sql`EXCLUDED.name` },
      })
    return expansions.map(e => e.id)
  }

  private async syncBlueprintsForSets(setIds: number[]): Promise<void> {
    await performBatched(setIds, this.config.httpBatchSize, async (setBatch) => {
      await Promise.allSettled(setBatch.map(async (setId) => {
        const inserts = (await this.apis.blueprints(setId))
          .map(cardTraderBlueprintToInsertBlueprint)
          .filter((blueprint): blueprint is InsertBlueprint => blueprint !== undefined)
        await performBatched(inserts, this.config.dbBatchSize, async (dbBatch) => {
          await DRIZZLE_DB.insert(cardtraderBlueprintsTable)
            .values(dbBatch)
            .onConflictDoNothing()
        })
      }))
    })
  }
}

async function performBatched<T>(items: T[], batchSize: number, callbackfn: (batch: T[]) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await callbackfn(batch)
  }
}

// MARK: - Types

type InsertSet = typeof cardtraderSetsTable.$inferSelect
type InsertBlueprint = typeof cardtraderBlueprintsTable.$inferSelect

// MARK: - Mappers

function cardTraderExpansionToInsertSet(expansion: CardTraderExpansion): InsertSet {
  return {
    id: expansion.id,
    code: expansion.code,
    name: expansion.name,
  }
}

function cardTraderBlueprintToInsertBlueprint(blueprint: CardTraderBlueprint): InsertBlueprint | undefined {
  // Avoid mapping blueprints that do not correspond to physical cards (e.g. tokens, emblems, etc.)
  return typeof blueprint.fixed_properties.collector_number === 'string'
    ? {
        id: blueprint.id,
        name: blueprint.name,
        normalized_name: normalizeSearchKey(blueprint.name),
        expansion_id: blueprint.expansion_id,
        coll_num: blueprint.fixed_properties.collector_number,
      }
    : undefined
}

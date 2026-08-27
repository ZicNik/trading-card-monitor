import type { CardTraderApis, CardTraderBlueprint, CardTraderExpansion } from '@/cardtrader'
import { DRIZZLE_DB } from '@/drizzle/db'
import { cardtraderBlueprintsTable, cardtraderSetsTable } from '@/drizzle/schema'

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
    console.log('Synchronizing CardTrader sets and blueprints')
    await synchonizer.syncSetsAndBlueprints()
  })
  void task.execute()
}

/** @see {@link SYNCHRONIZER_DEFAULTS} */
export type CardTraderDbSynchronizerConfig = Readonly<{
  httpBatchSize: number
  dbBatchSize: number
}>

export const SYNCHRONIZER_DEFAULTS = {
  httpBatchSize: 25,
  dbBatchSize: 250,
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
    const expansions = await this.apis.expansions()
    if (expansions === undefined || expansions.length === 0)
      return
    const blueprints: CardTraderBlueprint[] = []
    await performBatched(expansions, this.config.httpBatchSize, async (batch) => {
      blueprints.push(...(await Promise.allSettled(batch.map(e => this.apis.blueprints(e.id))))
        .filter((r): r is PromiseFulfilledResult<CardTraderBlueprint[]> =>
          r.status === 'fulfilled' && r.value !== undefined)
        .flatMap(r => r.value))
    })
    const setInserts = expansions.map(cardTraderExpansionToInsertSet)
    await DRIZZLE_DB.insert(cardtraderSetsTable)
      .values(setInserts)
      .onConflictDoUpdate({
        target: cardtraderSetsTable.id,
        set: { code: sql`EXCLUDED.code`, name: sql`EXCLUDED.name` },
      })
    const blueprintInserts = blueprints.map(cardTraderBlueprintToInsertBlueprint)
      .filter((b): b is InsertBlueprint => b !== undefined)
    await performBatched(blueprintInserts, this.config.dbBatchSize, async (batch) => {
      await DRIZZLE_DB.insert(cardtraderBlueprintsTable)
        .values(batch)
        .onConflictDoNothing()
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

type InsertSet = typeof cardtraderSetsTable.$inferInsert
type InsertBlueprint = typeof cardtraderBlueprintsTable.$inferInsert

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
        expansion_id: blueprint.expansion_id,
        coll_num: blueprint.fixed_properties.collector_number,
      }
    : undefined
}

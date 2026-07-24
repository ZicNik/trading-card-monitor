import { DRIZZLE_DB } from '@/drizzle/db'
import { cardtraderBlueprintsTable, cardtraderSetsTable } from '@/drizzle/schema'
import { sql } from 'drizzle-orm'
import type { CardTraderApis } from "./apis"
import type { CardTraderBlueprint, CardTraderExpansion } from './types'

/** Synchronizes data from CardTrader to the application database. */
export class CardTraderDbSynchronizer {
  constructor(private readonly apis: CardTraderApis) {}

  /** Loads or updates the application's set and blueprint tables with the latest data from CardTrader. */
  async syncSetsAndBlueprints(): Promise<void> {
    const expansions = await this.apis.expansions()
    if (expansions === undefined || expansions.length === 0)
      return
    const blueprints = (await Promise.allSettled(expansions.map(e => this.apis.blueprints(e.id))))
      .filter((r): r is PromiseFulfilledResult<CardTraderBlueprint[]> =>
        r.status === 'fulfilled' && r.value !== undefined)
      .flatMap(r => r.value)
    const setInserts = expansions.map(cardTraderExpansionToInsertSet)
    await DRIZZLE_DB.insert(cardtraderSetsTable)
      .values(setInserts)
      .onConflictDoUpdate({
        target: cardtraderSetsTable.id,
        set: { code: sql`EXCLUDED.code`, name: sql`EXCLUDED.name` },
      })
    const blueprintInserts = blueprints.map(cardTraderBlueprintToInsertBlueprint)
      .filter((b): b is InsertBlueprint => b !== undefined)
    // Batch inserts into chunks to prevent limit errors
    const batchSize = 1000;
    for (let i = 0; i < blueprintInserts.length; i += batchSize) {
      const batch = blueprintInserts.slice(i, i + batchSize)
      await DRIZZLE_DB.insert(cardtraderBlueprintsTable)
        .values(batch)
        .onConflictDoNothing()
    }
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
  return typeof blueprint.fixed_properties.collector_number === 'string' ? {
      id: blueprint.id,
      name: blueprint.name,
      expansion_id: blueprint.expansion_id,
      coll_num: blueprint.fixed_properties.collector_number,
    } : undefined
}

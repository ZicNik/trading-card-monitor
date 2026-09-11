import { eq, inArray } from 'drizzle-orm'

import type { CardTraderMonitorFiltersProps } from '@/cardtrader'
import { CardCondition, CardMonitor, MonitorBaseFilters, MonitorMarketFilters, type CardMonitorCreationArgs, type CardMonitorRepository, type CardPrintingProps, type MarketType } from '@/core'

import { DRIZZLE_DB } from '../db'
import { cardMonitorsTable, cardtraderMonitorFiltersTable, monitoredPrintingsTable } from '../schema'
import { fromDbBoolean, toDbBoolean } from '../utils'

export class DbCardMonitorRepository implements CardMonitorRepository {
  async findById(id: number): Promise<CardMonitor | undefined> {
    const monitor = (await DRIZZLE_DB.select()
      .from(cardMonitorsTable)
      .where(eq(cardMonitorsTable.id, id))
      .limit(1)
    )[0]
    if (monitor === undefined)
      return undefined
    const printings = await DRIZZLE_DB.select()
      .from(monitoredPrintingsTable)
      .where(eq(monitoredPrintingsTable.card_monitor_id, id))
    if (printings.length === 0)
      return undefined
    // CardTrader
    if (fromDbBoolean(monitor.target_cardtrader)) {
      const filters = (await DRIZZLE_DB.select()
        .from(cardtraderMonitorFiltersTable)
        .where(eq(cardtraderMonitorFiltersTable.card_monitor_id, id))
        .limit(1)
      )[0]
      if (filters === undefined)
        return undefined
      return selectToCardTraderMonitor(monitor, printings, filters)
    }
    return undefined
  }

  async findByUserId(userId: string): Promise<CardMonitor[]> {
    const monitors = await DRIZZLE_DB.select()
      .from(cardMonitorsTable)
      .where(eq(cardMonitorsTable.user_id, userId))
    const monitorIds = monitors.map(m => m.id)
    const printings = await DRIZZLE_DB.select()
      .from(monitoredPrintingsTable)
      .where(inArray(monitoredPrintingsTable.card_monitor_id, monitorIds))
    const cardtraderFiltersArray = await DRIZZLE_DB.select()
      .from(cardtraderMonitorFiltersTable)
      .where(inArray(cardtraderMonitorFiltersTable.card_monitor_id, monitorIds))
    return selectToCardMonitors(monitors, printings, cardtraderFiltersArray)
  }

  async getAll(): Promise<CardMonitor[]> {
    const monitors = await DRIZZLE_DB.select().from(cardMonitorsTable)
    const printings = await DRIZZLE_DB.select().from(monitoredPrintingsTable)
    const cardtraderFiltersArray = await DRIZZLE_DB.select().from(cardtraderMonitorFiltersTable)
    return selectToCardMonitors(monitors, printings, cardtraderFiltersArray)
  }

  async createAndSave<T extends MarketType = MarketType>(args: CardMonitorCreationArgs<T>): Promise<CardMonitor<T>> {
    const id = (await DRIZZLE_DB.insert(cardMonitorsTable)
      .values(createToInsert(args)).returning({ id: cardMonitorsTable.id }))[0]?.id
    if (id === undefined)
      throw new Error('Failed to insert card monitor') // This should never happen
    if (args.baseFilters.printings.length > 0) {
      await DRIZZLE_DB.insert(monitoredPrintingsTable)
        .values(monitoredPrintingsToInsert(id, args.baseFilters.printings))
    }
    // CardTrader
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (args.marketFilters.market === 'cardtrader') {
      await DRIZZLE_DB.insert(cardtraderMonitorFiltersTable)
        .values(cardtraderFiltersToInsert(id, args.marketFilters))
    }
    return createToCardMonitor(id, args)
  }

  async delete(id: number): Promise<void> {
    await DRIZZLE_DB.delete(cardMonitorsTable).where(eq(cardMonitorsTable.id, id))
  }
}

// MARK: - Types

type InsertCardMonitor = typeof cardMonitorsTable.$inferInsert
type InsertMonitoredPrinting = typeof monitoredPrintingsTable.$inferInsert
type InsertCardTraderMonitorFilter = typeof cardtraderMonitorFiltersTable.$inferInsert
type SelectCardMonitor = typeof cardMonitorsTable.$inferSelect
type SelectMonitoredPrinting = typeof monitoredPrintingsTable.$inferSelect
type SelectCardTraderMonitorFilter = typeof cardtraderMonitorFiltersTable.$inferSelect

// MARK: - Mappers

function selectToPrintings(printings: SelectMonitoredPrinting[]): CardPrintingProps[] {
  return printings.map(p => ({
    setName: p.set_name,
    setCode: p.set_code,
    collectorNum: p.coll_num,
    url: p.url,
  }))
}

function selectToCardTraderFilters(filters: SelectCardTraderMonitorFilter): CardTraderMonitorFiltersProps {
  return {
    market: 'cardtrader',
    ...(filters.ct_zero !== null ? { ctZero: fromDbBoolean(filters.ct_zero) } : {}),
  }
}

function selectToCardTraderMonitor(
  monitor: SelectCardMonitor,
  printings: SelectMonitoredPrinting[],
  filters: SelectCardTraderMonitorFilter,
): CardMonitor {
  return new CardMonitor(
    monitor.id,
    monitor.user_id,
    monitor.card_name,
    new MonitorBaseFilters({
      printings: selectToPrintings(printings),
      maxEuroCents: monitor.max_euro_cents,
      ...(monitor.min_condition !== null ? { minCondition: monitor.min_condition as CardCondition } : {}),
      ...(monitor.language !== null ? { language: monitor.language } : {}),
      ...(monitor.foil !== null ? { foil: fromDbBoolean(monitor.foil) } : {}),
    }),
    MonitorMarketFilters.create(selectToCardTraderFilters(filters)),
  )
}

function selectToCardMonitors(
  monitors: SelectCardMonitor[],
  printings: SelectMonitoredPrinting[],
  cardtraderFiltersArray: SelectCardTraderMonitorFilter[],
): CardMonitor[] {
  const result: CardMonitor[] = []
  for (const monitor of monitors) {
    const monitorPrintings = printings
      .filter(p => p.card_monitor_id === monitor.id)
    if (monitorPrintings.length === 0)
      continue
    // CardTrader
    if (fromDbBoolean(monitor.target_cardtrader)) {
      const filters = cardtraderFiltersArray.find(f => f.card_monitor_id === monitor.id)
      if (filters === undefined)
        continue
      result.push(selectToCardTraderMonitor(monitor, monitorPrintings, filters))
    }
  }
  return result
}

function createToCardMonitor<T extends MarketType = MarketType>(id: number, args: CardMonitorCreationArgs<T>): CardMonitor<T> {
  return new CardMonitor(
    id,
    args.userId,
    args.cardName,
    new MonitorBaseFilters(args.baseFilters),
    MonitorMarketFilters.create(args.marketFilters),
  )
}

function createToInsert<T extends MarketType = MarketType>(args: CardMonitorCreationArgs<T>): InsertCardMonitor {
  return {
    user_id: args.userId,
    card_name: args.cardName,
    max_euro_cents: args.baseFilters.maxEuroCents,
    ...(args.baseFilters.minCondition !== undefined ? { min_condition: args.baseFilters.minCondition } : {}),
    ...(args.baseFilters.language !== undefined ? { language: args.baseFilters.language } : {}),
    ...(args.baseFilters.foil !== undefined ? { foil: toDbBoolean(args.baseFilters.foil) } : {}),
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    target_cardtrader: toDbBoolean(args.marketFilters.market === 'cardtrader'),
  }
}

function monitoredPrintingsToInsert(monitorId: number, printings: readonly CardPrintingProps[]): InsertMonitoredPrinting[] {
  return printings.map(p => ({
    card_monitor_id: monitorId,
    set_name: p.setName,
    set_code: p.setCode,
    coll_num: p.collectorNum,
    url: p.url,
  }))
}

function cardtraderFiltersToInsert(monitorId: number, filters: CardTraderMonitorFiltersProps): InsertCardTraderMonitorFilter {
  return {
    card_monitor_id: monitorId,
    ...(filters.ctZero !== undefined ? { ct_zero: toDbBoolean(filters.ctZero) } : {}),
  }
}

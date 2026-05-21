import { CardMonitor, type CardMonitorCreationArgs, type CardMonitorRepository, type CardPrinting, type MarketType, type MonitorMarketFilters } from '@/core'
import { eq, inArray } from 'drizzle-orm'
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
    const cardtraderFilters = fromDbBoolean(monitor.target_cardtrader)
      ? (await DRIZZLE_DB.select()
          .from(cardtraderMonitorFiltersTable)
          .where(eq(cardtraderMonitorFiltersTable.card_monitor_id, id))
          .limit(1)
        )[0]
      : undefined
    return selectToCardMonitor(monitor, printings, cardtraderFilters)
  }

  async findByUserId(userId: string): Promise<CardMonitor[]> {
    const monitors = await DRIZZLE_DB.select()
      .from(cardMonitorsTable)
      .where(eq(cardMonitorsTable.user_id, userId))
    const monitorIds = monitors.map(m => m.id)
    const printings = await DRIZZLE_DB.select()
      .from(monitoredPrintingsTable)
      .where(inArray(monitoredPrintingsTable.card_monitor_id, monitorIds))
    const cardtraderFilters = await DRIZZLE_DB.select()
      .from(cardtraderMonitorFiltersTable)
      .where(inArray(cardtraderMonitorFiltersTable.card_monitor_id, monitorIds))
    return monitors.map(m => selectToCardMonitor(
      m,
      printings.filter(p => p.card_monitor_id === m.id),
      cardtraderFilters.find(f => f.card_monitor_id === m.id)))
  }

  async getAll(): Promise<CardMonitor[]> {
    const monitors = await DRIZZLE_DB.select().from(cardMonitorsTable)
    const monitorIds = monitors.map(m => m.id)
    const printings = await DRIZZLE_DB.select()
      .from(monitoredPrintingsTable)
      .where(inArray(monitoredPrintingsTable.card_monitor_id, monitorIds))
    const cardtraderFilters = await DRIZZLE_DB.select()
      .from(cardtraderMonitorFiltersTable)
      .where(inArray(cardtraderMonitorFiltersTable.card_monitor_id, monitorIds))
    return monitors.map(m => selectToCardMonitor(
      m,
      printings.filter(p => p.card_monitor_id === m.id),
      cardtraderFilters.find(f => f.card_monitor_id === m.id)))
  }

  async createAndSave(args: CardMonitorCreationArgs): Promise<CardMonitor> {
    const id = (await DRIZZLE_DB.insert(cardMonitorsTable)
      .values(createToInsert(args)).returning({ id: cardMonitorsTable.id }))[0]?.id
    if (id === undefined)
      throw new Error('Failed to insert card monitor') // This should never happen
    if (args.baseFilters.printings !== undefined && args.baseFilters.printings.length > 0) {
      await DRIZZLE_DB.insert(monitoredPrintingsTable)
        .values(monitoredPrintingsToInsert(id, args.baseFilters.printings))
    }
    if (args.targetMarkets.includes('cardtrader') && args.marketFilters.cardtrader !== undefined) {
      await DRIZZLE_DB.insert(cardtraderMonitorFiltersTable)
        .values(cardtraderFiltersToInsert(id, args.marketFilters.cardtrader))
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

function selectToCardMonitor(
  monitor: SelectCardMonitor,
  printings: SelectMonitoredPrinting[],
  cardtraderFilters?: SelectCardTraderMonitorFilter,
): CardMonitor {
  const targetMarkets: MarketType[] = []
  if (fromDbBoolean(monitor.target_cardtrader))
    targetMarkets.push('cardtrader')
  return new CardMonitor(
    monitor.id,
    monitor.user_id,
    monitor.card_name,
    {
      maxEuroCents: monitor.max_euro_cents,
      ...(monitor.foil !== null ? { foil: fromDbBoolean(monitor.foil) } : {}),
      ...(printings.length > 0
        ? {
            printings: printings.map(p => ({
              setCode: p.set_code,
              collectorNum: p.coll_num,
            })),
          }
        : {}),
    },
    targetMarkets,
    {
      ...(cardtraderFilters !== undefined
        ? {
            cardtrader: {
              market: 'cardtrader',
              ...(cardtraderFilters.ct_zero !== null ? { ctZero: fromDbBoolean(cardtraderFilters.ct_zero) } : {}),
            },
          }
        : {}),
    },
  )
}

function createToCardMonitor(id: number, args: CardMonitorCreationArgs): CardMonitor {
  return new CardMonitor(
    id,
    args.userId,
    args.cardName,
    args.baseFilters,
    args.targetMarkets,
    args.marketFilters,
  )
}

function createToInsert(args: CardMonitorCreationArgs): InsertCardMonitor {
  return {
    user_id: args.userId,
    card_name: args.cardName,
    max_euro_cents: args.baseFilters.maxEuroCents,
    ...(args.baseFilters.foil !== undefined ? { foil: toDbBoolean(args.baseFilters.foil) } : {}),
    target_cardtrader: toDbBoolean(args.targetMarkets.includes('cardtrader')),
  }
}

function monitoredPrintingsToInsert(monitorId: number, printings: CardPrinting[]): InsertMonitoredPrinting[] {
  return printings.map(p => ({
    card_monitor_id: monitorId,
    set_code: p.setCode,
    coll_num: p.collectorNum,
  }))
}

function cardtraderFiltersToInsert(monitorId: number, filters: MonitorMarketFilters<'cardtrader'>): InsertCardTraderMonitorFilter {
  return {
    card_monitor_id: monitorId,
    ...(filters.ctZero !== undefined ? { ct_zero: toDbBoolean(filters.ctZero) } : {}),
  }
}

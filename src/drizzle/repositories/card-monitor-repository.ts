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
    // CardTrader
    if (fromDbBoolean(monitor.target_cardtrader)) {
      const filters = (await DRIZZLE_DB.select()
        .from(cardtraderMonitorFiltersTable)
        .where(eq(cardtraderMonitorFiltersTable.card_monitor_id, id))
        .limit(1)
      )[0]
      return selectToCardTraderCardMonitor(monitor, printings, filters)
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
    return [
      ...(await this.getCardTraderMonitorsFor(monitors, printings)),
    ]
  }

  async getAll(): Promise<CardMonitor[]> {
    const monitors = await DRIZZLE_DB.select().from(cardMonitorsTable)
    const monitorIds = monitors.map(m => m.id)
    const printings = await DRIZZLE_DB.select()
      .from(monitoredPrintingsTable)
      .where(inArray(monitoredPrintingsTable.card_monitor_id, monitorIds))
    return [
      ...(await this.getCardTraderMonitorsFor(monitors, printings)),
    ]
  }

  private async getCardTraderMonitorsFor(monitors: SelectCardMonitor[], printings: SelectMonitoredPrinting[]): Promise<CardMonitor<'cardtrader'>[]> {
    const ctMonitors = monitors.filter(m => fromDbBoolean(m.target_cardtrader))
    const ctMonitorIds = ctMonitors.map(m => m.id)
    const ctFilters = await DRIZZLE_DB.select()
      .from(cardtraderMonitorFiltersTable)
      .where(inArray(cardtraderMonitorFiltersTable.card_monitor_id, ctMonitorIds))
    return ctMonitors
      .map(m => selectToCardTraderCardMonitor(
        m,
        printings.filter(p => p.card_monitor_id === m.id),
        ctFilters.find(f => f.card_monitor_id === m.id),
      ))
      .filter((m): m is CardMonitor<'cardtrader'> => m !== undefined)
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

function selectToCardTraderCardMonitor(
  monitor: SelectCardMonitor,
  printings: SelectMonitoredPrinting[],
  filters?: SelectCardTraderMonitorFilter,
): CardMonitor<'cardtrader'> | undefined {
  return filters !== undefined
    ? new CardMonitor(
        monitor.id,
        monitor.user_id,
        monitor.card_name,
        {
          maxEuroCents: monitor.max_euro_cents,
          printings: printings.map(p => ({
            setCode: p.set_code,
            collectorNum: p.coll_num,
          })),
          ...(monitor.foil !== null ? { foil: fromDbBoolean(monitor.foil) } : {}),
        },
        {
          market: 'cardtrader',
          ...(filters.ct_zero !== null ? { ctZero: fromDbBoolean(filters.ct_zero) } : {}),
        },
      )
    : undefined
}

function createToCardMonitor<T extends MarketType = MarketType>(id: number, args: CardMonitorCreationArgs<T>): CardMonitor<T> {
  return new CardMonitor(
    id,
    args.userId,
    args.cardName,
    args.baseFilters,
    args.marketFilters,
  )
}

function createToInsert<T extends MarketType = MarketType>(args: CardMonitorCreationArgs<T>): InsertCardMonitor {
  return {
    user_id: args.userId,
    card_name: args.cardName,
    max_euro_cents: args.baseFilters.maxEuroCents,
    ...(args.baseFilters.foil !== undefined ? { foil: toDbBoolean(args.baseFilters.foil) } : {}),
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    target_cardtrader: toDbBoolean(args.marketFilters.market === 'cardtrader'),
  }
}

function monitoredPrintingsToInsert(monitorId: number, printings: readonly CardPrinting[]): InsertMonitoredPrinting[] {
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

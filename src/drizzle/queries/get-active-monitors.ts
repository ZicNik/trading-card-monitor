import { and, eq, gte, inArray } from 'drizzle-orm'

import type { CardCondition } from '@/core'
import type { Clock } from '@/time'
import type { CardTraderDetailsRecap, GetActiveMonitorsQuery, GetActiveMonitorsReader, GetActiveMonitorsResult, MonitorRecap, PrintingRecap } from '@/use-cases'

import { DRIZZLE_DB } from '../db'
import { cardMonitorsTable, cardtraderMonitorFiltersTable, monitoredPrintingsTable } from '../schema'
import { fromDbBoolean, fromDbDate, toDbDate } from '../utils'

export class GetActiveMonitorsDbReader implements GetActiveMonitorsReader {
  constructor(readonly clock: Clock) {}

  async read(query: GetActiveMonitorsQuery): Promise<GetActiveMonitorsResult> {
    const today = toDbDate(this.clock.today())
    const monitors = await DRIZZLE_DB.select()
      .from(cardMonitorsTable)
      .where(and(
        eq(cardMonitorsTable.user_id, query.userId),
        gte(cardMonitorsTable.expiration, today),
      ))
    const monitorIds = monitors.map(m => m.id)
    const printings = await DRIZZLE_DB.select()
      .from(monitoredPrintingsTable)
      .where(inArray(monitoredPrintingsTable.card_monitor_id, monitorIds))
    const cardtraderDetailsArray = await DRIZZLE_DB.select()
      .from(cardtraderMonitorFiltersTable)
      .where(inArray(cardtraderMonitorFiltersTable.card_monitor_id, monitorIds))
    return selectToResult(monitors, printings, cardtraderDetailsArray)
  }
}

// MARK: - Types

type SelectCardMonitor = typeof cardMonitorsTable.$inferSelect
type SelectMonitoredPrinting = typeof monitoredPrintingsTable.$inferSelect
type SelectCardTraderMonitorFilter = typeof cardtraderMonitorFiltersTable.$inferSelect

// MARK: - Mappers

function selectToPrintings(printings: SelectMonitoredPrinting[]): PrintingRecap[] {
  return printings.map(p => ({
    setName: p.set_name,
    setCode: p.set_code,
    collectorNum: p.coll_num,
    url: p.url,
  }))
}

function selectToCardTraderDetails(filters: SelectCardTraderMonitorFilter): CardTraderDetailsRecap {
  return {
    market: 'cardtrader',
    ...(filters.ct_zero !== null ? { ctZero: fromDbBoolean(filters.ct_zero) } : {}),
  }
}

function selectToCardTraderMonitor(
  monitor: SelectCardMonitor,
  printings: SelectMonitoredPrinting[],
  filters: SelectCardTraderMonitorFilter,
): MonitorRecap {
  return {
    id: monitor.id,
    cardName: monitor.card_name,
    printings: selectToPrintings(printings),
    maxEuroCents: monitor.max_euro_cents,
    ...(monitor.min_condition !== null ? { minCondition: monitor.min_condition as CardCondition } : {}),
    ...(monitor.language !== null ? { language: monitor.language } : {}),
    ...(monitor.foil !== null ? { foil: fromDbBoolean(monitor.foil) } : {}),
    marketDetails: selectToCardTraderDetails(filters),
    expiration: fromDbDate(monitor.expiration),
  }
}

function selectToResult(
  monitors: SelectCardMonitor[],
  printings: SelectMonitoredPrinting[],
  cardtraderDetailsArray: SelectCardTraderMonitorFilter[],
): MonitorRecap[] {
  const result: MonitorRecap[] = []
  for (const monitor of monitors) {
    const monitorPrintings = printings
      .filter(p => p.card_monitor_id === monitor.id)
    if (monitorPrintings.length === 0)
      continue
    // CardTrader
    if (fromDbBoolean(monitor.target_cardtrader)) {
      const details = cardtraderDetailsArray.find(d => d.card_monitor_id === monitor.id)
      if (details === undefined)
        continue
      result.push(selectToCardTraderMonitor(monitor, monitorPrintings, details))
    }
  }
  return result
}

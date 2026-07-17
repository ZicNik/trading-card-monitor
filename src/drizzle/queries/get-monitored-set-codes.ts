import type { GetMonitoredSetCodesQuery, GetMonitoredSetCodesResult } from '@/core'
import { DRIZZLE_DB } from '../db'

export class DbGetMonitoredSetCodesQuery implements GetMonitoredSetCodesQuery {
  async execute(): Promise<GetMonitoredSetCodesResult> {

  }
}

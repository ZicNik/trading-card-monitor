import { lt } from 'drizzle-orm'
import nodeCron from 'node-cron'

import { DRIZZLE_DB } from '@/drizzle/db'
import { cardMonitorsTable } from '@/drizzle/schema'
import { toDbDate } from '@/drizzle/utils'

/** Launches a cron job that periodically cleans up stale card monitors from the db. */
export function startMonitorsCleanup(): void {
  nodeCron.schedule('@daily', () => DRIZZLE_DB.delete(cardMonitorsTable)
    .where(lt(cardMonitorsTable.expiration, checkDate())))
}

function checkDate(): string {
  return toDbDate(Temporal.Now.plainDateISO().subtract({ days: 1 })) // Let expired monitors stay one more day, as a buffer
}

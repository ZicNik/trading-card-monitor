import { APP_CONFIG } from '@/config'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

const client = createClient({ url: APP_CONFIG.dbUrl })
export const DRIZZLE_DB = drizzle({ client })

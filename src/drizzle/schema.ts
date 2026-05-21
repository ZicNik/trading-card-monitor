import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const usersTable = sqliteTable('users', {
  id: text().primaryKey(),
})

export const cardMonitorsTable = sqliteTable('card_monitors', {
  id: integer().primaryKey({ autoIncrement: true }),
  user_id: text().notNull().references(() => usersTable.id),
  card_name: text().notNull(),
  max_euro_cents: integer().notNull(),
  foil: integer(),
  target_cardtrader: integer().notNull(),
})

export const monitoredPrintingsTable = sqliteTable('monitored_printings', {
  card_monitor_id: integer().notNull()
    .references(() => cardMonitorsTable.id, { onDelete: 'cascade' }),
  set_code: text().notNull(),
  coll_num: text().notNull(),
})

export const cardtraderMonitorFiltersTable = sqliteTable('cardtrader_monitor_filters', {
  card_monitor_id: integer().notNull()
    .references(() => cardMonitorsTable.id, { onDelete: 'cascade' }),
  ct_zero: integer(),
})

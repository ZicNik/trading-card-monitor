import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: process.env.DB_DIALECT,
  out: './db-migration',
  schema: './src/drizzle/schema.ts',
  dbCredentials: {
    url: process.env.DB_URL,
    authToken: process.env.DB_TOKEN,
  },
})

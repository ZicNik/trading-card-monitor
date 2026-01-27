import dotenv from 'dotenv'
import { z } from 'zod'

const schema = z.object({
  BOT_TOKEN: z.string(),
  WEBHOOK_DOMAIN: z.string(),
  PORT: z.coerce.number().nonnegative().int(),
  // Optional TLS configuration
  CERT_PATH: z.string().optional(),
  KEY_PATH: z.string().optional(),
})

export const APP_CONFIG = (() => {
  dotenv.config()
  const result = schema.safeParse(process.env)
  if (!result.success)
    throw new Error(`Invalid dontenv configuration:\n\t${result.error.message}`)
  const data = result.data
  const tls = (() => {
    // All or nothing for TLS configuration
    if (data.CERT_PATH !== undefined && data.KEY_PATH !== undefined)
      return {
        certPath: data.CERT_PATH,
        keyPath: data.KEY_PATH,
      } as const
    if (!(data.CERT_PATH === undefined && data.KEY_PATH === undefined))
      throw new Error('Invalid TLS configuration in dotenv')
    return undefined
  })()
  return {
    botToken: data.BOT_TOKEN,
    webhookDomain: data.WEBHOOK_DOMAIN,
    port: data.PORT,
    ...(tls !== undefined ? { tls } : {}),
  } as const
})()

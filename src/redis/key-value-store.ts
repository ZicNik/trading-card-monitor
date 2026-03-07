import { APP_CONFIG } from '@/config'
import Redis from 'ioredis'

export const KEY_VALUE_STORE = new Redis(APP_CONFIG.redisUrl)

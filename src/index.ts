import 'temporal-polyfill/global'

import { CardTraderApis, CardTraderCardFetcher, CardTraderListingCatalog } from '@/cardtrader'
import { APP_CONFIG } from '@/config'
import { DbCardMonitorRepository, DbUserRepository } from '@/drizzle'
import { EventBus } from '@/event-bus'
import { GrammyInputPort, GrammyOutputPort } from '@/grammy'
import { startCardTraderDbSynchronization, startMarketScanning, startMonitorsCleanup } from '@/jobs'
import { RedisStateMachineStorage } from '@/redis'
import { ScryfallApis, ScryfallCatalog } from '@/scryfall'
import { CardCatalog } from '@/search'
import { SystemClock } from '@/system-time'
import { createUI } from '@/ui'
import { createCardMonitorMatchNotifier } from '@/ui/notifications'
import { NotifyCardMonitorMatchUseCase } from '@/use-cases'
import { GetActiveMonitorsDbReader } from './drizzle/queries/get-active-monitors'

// Compose dependencies
const clock = new SystemClock({ defaultTimezone: APP_CONFIG.defaultTimezone })
const eventBus = new EventBus()
const scryfallApis = new ScryfallApis({ timeoutMs: 7000, retries: 3 })
const scryfallCatalog = new ScryfallCatalog(scryfallApis)
const cardTraderApis = new CardTraderApis()
const cardTraderCardFetcher = new CardTraderCardFetcher()
const cardCatalog = new CardCatalog({
  fuzzySearcher: scryfallCatalog,
  noMarketFetcher: scryfallCatalog,
  marketFetchers: { cardtrader: cardTraderCardFetcher },
})
const listingCatalog = new CardTraderListingCatalog(cardTraderApis)
const monitorRepo = new DbCardMonitorRepository({ clock })
const userRepo = new DbUserRepository()
const botOutputPort = new GrammyOutputPort()
const notifyMonitorMatchUseCase = new NotifyCardMonitorMatchUseCase(
  createCardMonitorMatchNotifier(botOutputPort),
  monitorRepo,
)
const UI = createUI({
  inputPort: new GrammyInputPort(),
  outputPort: new GrammyOutputPort(),
  storage: new RedisStateMachineStorage(),
  userRepo,
  monitorRepo,
  cardCatalog,
  activeMonitorsReader: new GetActiveMonitorsDbReader(clock),
})

// Register handlers
eventBus.subscribe('cardMonitorMatched', event => notifyMonitorMatchUseCase.execute({
  monitorId: event.monitorId,
  listings: event.listings.map(l => ({
    setName: l.baseAttributes.printing.setName,
    setCode: l.baseAttributes.printing.setCode,
    collectorNum: l.baseAttributes.printing.collectorNum,
    url: l.baseAttributes.printing.url,
    seller: l.baseAttributes.seller,
    euroCents: l.baseAttributes.euroCents,
    foil: l.baseAttributes.foil,
  })),
}))

// Start cron jobs
startCardTraderDbSynchronization({ apis: cardTraderApis })
startMarketScanning({
  cardMonitorRepo: monitorRepo,
  cardListingCatalog: listingCatalog,
  publisher: eventBus,
})
startMonitorsCleanup()

UI.start()

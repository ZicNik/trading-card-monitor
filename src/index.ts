/* eslint-disable @typescript-eslint/no-unused-vars */

import { BotUI } from '@/bot-ui/bot-ui'
import { CardTraderApis, CardTraderCardFetcher, CardTraderListingCatalog } from '@/cardtrader'
import { AddMonitorDoNothingOutputPort, AddMonitorUseCase, CardListing, CardMonitor, CardMonitorMatched, CardPrinting, MonitorBaseFilters, MonitorMarketFilters, type CardMonitorRepository } from '@/core'
import { DbCardMonitorRepository, DbUserRepository } from '@/drizzle'
import { EventBus } from '@/event-bus'
import { GrammyInputPort, GrammyOutputPort } from '@/grammy'
import { CardTraderDbSynchronizer, startCardTraderDbSynchronization, startMarketScanning } from '@/jobs'
import { RedisStateMachineStorage } from '@/redis'
import { ScryfallApis, ScryfallCatalog } from '@/scryfall'
import { CardCatalog } from '@/search'
import { UserRegistrationUseCase } from '@/use-cases'
import assert from 'node:assert'

// class TestUserRepository implements UserRepository {
//   private readonly users = new Map<string, User>()

//   findById(id: string): Promise<User | undefined> {
//     let user = this.users.get(id)
//     if (user === undefined) {
//       user = new User(id)
//       this.users.set(id, user)
//     }
//     return Promise.resolve(user)
//   }

//   save(user: User): Promise<void> {
//     this.users.set(user.id, user)
//     return Promise.resolve()
//   }
// }

// Compose dependencies
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
const monitorRepository = new DbCardMonitorRepository()
const userRepository = new DbUserRepository()
const userRegistrationUseCase = new UserRegistrationUseCase(userRepository)
const addMonitorUseCase = new AddMonitorUseCase(new AddMonitorDoNothingOutputPort(), monitorRepository)
const botUI = new BotUI(
  new RedisStateMachineStorage(),
  new GrammyInputPort(),
  new GrammyOutputPort(),
  userRegistrationUseCase,
  addMonitorUseCase,
  cardCatalog,
)

// Start cron jobs
// startCardTraderDbSynchronization({ apis: cardTraderApis })
// startMarketScanning({
//   cardMonitorRepo: monitorRepository,
//   cardListingCatalog: listingCatalog,
//   publisher: eventBus,
// })

// botUI.start()

async function testCardCatalog() {
  const prototype = await cardCatalog.fuzzySearch('subtle')
  console.log(prototype)
  if (prototype === undefined)
    return
  const noMarketCard = await cardCatalog.getCard(prototype.name)
  const cardTraderCard = await cardCatalog.getCard(prototype.name, 'cardtrader')
  console.log(noMarketCard)
  console.log(cardTraderCard)
}

// testCardCatalog().catch(console.error)

async function testCardTraderApis() {
  const expansions = await cardTraderApis.expansions()
  console.log(expansions)
  const expansionId = expansions?.[0]?.id
  if (expansionId === undefined)
    return
  const blueprints = await cardTraderApis.blueprints(expansionId)
  console.log(blueprints)
  const expansionProducts = await cardTraderApis.marketplaceProducts({ expansion_id: expansionId })
  console.log(expansionProducts)
  const blueprintId = blueprints?.[0]?.id
  if (blueprintId === undefined)
    return
  const blueprintProducts = await cardTraderApis.marketplaceProducts({ blueprint_id: blueprintId })
  console.log(blueprintProducts)
}

// testCardTraderApis().catch(console.error)

async function testCardMonitorRepository() {
  // Make sure these users exist in the database, or the foreign key constraint will fail
  const userId1 = '001'
  const userId2 = '002'
  const repo: CardMonitorRepository = new DbCardMonitorRepository()
  const m1 = await repo.createAndSave({
    userId: userId1,
    cardName: 'Black Lotus',
    baseFilters: {
      maxEuroCents: 1000,
      printings: [
        { setCode: 'LEA', collectorNum: '233' },
        { setCode: 'LEB', collectorNum: '233' },
      ],
    },
    marketFilters: { market: 'cardtrader' },
  })
  console.log(m1)
  const m2 = await repo.createAndSave({
    userId: userId2,
    cardName: 'Lightning Bolt',
    baseFilters: {
      maxEuroCents: 200,
      printings: [
        { setCode: 'LEA', collectorNum: '100' },
        { setCode: 'LEB', collectorNum: '101' },
      ],
    },
    marketFilters: { market: 'cardtrader' },
  })
  console.log(m2)
  const user1Monitors = await repo.findByUserId(userId1)
  console.log(user1Monitors)
  const allMonitors = await repo.getAll()
  console.log(allMonitors)
  await repo.delete(m2.id)
}

// testCardMonitorRepository().catch(console.error)

async function testCardTraderListingCatalog() {
  const synchronizer = new CardTraderDbSynchronizer({ apis: cardTraderApis })
  const catalog = new CardTraderListingCatalog(cardTraderApis)
  await synchronizer.syncSetsAndBlueprints()
  const listings = await catalog.findByCardName('Moonshadow')
  console.log(listings)
}

// testCardTraderListingCatalog().catch(console.error)

function testCardMonitorMatches() {
  const monitor = new CardMonitor(
    0,
    'user1',
    'Black Lotus',
    new MonitorBaseFilters({
      maxEuroCents: 1000,
      printings: [
        { setCode: 'LEA', collectorNum: '233' },
        { setCode: 'LEB', collectorNum: '233' },
      ],
    }),
    MonitorMarketFilters.create({
      market: 'cardtrader',
      ctZero: true,
    }),
  )
  const l1 = new CardListing(1,
    {
      name: 'Black Lotus',
      euroCents: 1500,
      foil: false,
      printing: new CardPrinting({ setCode: 'LEA', collectorNum: '233' }),
      url: '',
    },
    { market: 'cardtrader', ctZero: true },
  )
  const l2 = new CardListing(2,
    {
      name: 'Lightning Bolt',
      euroCents: 1,
      foil: true,
      printing: new CardPrinting({ setCode: 'LEA', collectorNum: '100' }),
      url: '',
    },
    { market: 'cardtrader', ctZero: true },
  )
  const l3 = new CardListing(3,
    {
      name: 'Black Lotus',
      euroCents: 1000,
      foil: false,
      printing: new CardPrinting({ setCode: 'LEB', collectorNum: '233' }),
      url: '',
    },
    { market: 'cardtrader', ctZero: true },
  )
  const l4 = new CardListing(4,
    {
      name: 'Black Lotus',
      euroCents: 1000,
      foil: true,
      printing: new CardPrinting({ setCode: 'LEB', collectorNum: '233' }),
      url: '',
    },
    { market: 'cardtrader', ctZero: true },
  )
  const l5 = new CardListing(5,
    {
      name: 'Black Lotus',
      euroCents: 1000,
      foil: true,
      printing: new CardPrinting({ setCode: 'LEB', collectorNum: '233' }),
      url: '',
    },
    { market: 'cardtrader', ctZero: false },
  )
  monitor.match([l1, l2, l3, l4, l5])
  const matchedIds = (monitor.events[0] as CardMonitorMatched).listings.map(l => l.id)
  const expectedIds = [3, 4] as const
  assert(matchedIds.every((id, index) => id === expectedIds[index]))
}

// testCardMonitorMatches()

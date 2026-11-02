import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import 'temporal-polyfill/global'

import { CardTraderApis, CardTraderCardFetcher, CardTraderListingCatalog } from './cardtrader'
import { APP_CONFIG } from './config'
import { CardListing, CardMonitor, CardMonitorMatched, CardPrinting, MonitorBaseFilters, MonitorMarketFilters, type CardMonitorRepository } from './core'
import { DbCardMonitorRepository, DbUserRepository } from './drizzle'
import { Bucket } from './http'
import { CardTraderDbSynchronizer } from './jobs'
import { ScryfallApis, ScryfallCatalog } from './scryfall'
import { CardCatalog } from './search'
import { SystemClock } from './system-time'
import { User, type UserRepository } from './user'

const clock = new SystemClock({ defaultTimezone: APP_CONFIG.defaultTimezone })
const scryfallApis = new ScryfallApis({ timeoutMs: 7000, retries: 3 })
const scryfallCatalog = new ScryfallCatalog(scryfallApis)
const cardTraderApis = new CardTraderApis({
  sharedBucket: new Bucket({ capacity: 100, interval: 10000 }),
  marketplaceProductsBucket: new Bucket({ capacity: 4, interval: 1000 }),
})
const cardTraderCardFetcher = new CardTraderCardFetcher()
const cardCatalog = new CardCatalog({
  fuzzySearcher: scryfallCatalog,
  noMarketFetcher: scryfallCatalog,
  marketFetchers: { cardtrader: cardTraderCardFetcher },
})
const userId1 = '001'
const userId2 = '002'

before(async () => {
  const userRepo: UserRepository = new DbUserRepository()
  if (await userRepo.findById(userId1) === undefined)
    await userRepo.save(new User(userId1))
  if (await userRepo.findById(userId2) === undefined)
    await userRepo.save(new User(userId2))
})

void test('can query card trader apis', async () => {
  const expansions = await cardTraderApis.expansions()
  assert.ok(Array.isArray(expansions))

  const expansionId = expansions[0]?.id
  assert.ok(expansionId !== undefined)

  const blueprints = await cardTraderApis.blueprints(expansionId)
  assert.ok(Array.isArray(blueprints))

  const expansionProducts = await cardTraderApis.marketplaceProducts({ expansion_id: expansionId })
  assert.ok(expansionProducts)

  const blueprintId = blueprints[0]?.id
  assert.ok(blueprintId !== undefined)

  const blueprintProducts = (await cardTraderApis.marketplaceProducts({ blueprint_id: blueprintId }))[blueprintId]
  assert.ok(Array.isArray(blueprintProducts))
})

void test('can synchronize card trader listings and query by card name', async () => {
  const synchronizer = new CardTraderDbSynchronizer({ apis: cardTraderApis })
  const catalog = new CardTraderListingCatalog(cardTraderApis)

  await synchronizer.syncSetsAndBlueprints()
  const listings = await catalog.findByCardName('Moonshadow')
  assert.ok(Array.isArray(listings))
})

void test('can search a card through the catalog', async () => {
  const prototype = await cardCatalog.fuzzySearch('subtle')
  assert.ok(prototype)

  const noMarketCard = await cardCatalog.getCard(prototype.name)
  assert.ok(noMarketCard)

  const cardTraderCard = await cardCatalog.getCard(prototype.name, 'cardtrader')
  assert.ok(cardTraderCard)
})

void test('can create, query and delete card monitors', async () => {
  const repo: CardMonitorRepository = new DbCardMonitorRepository({ clock })

  const m1 = await repo.createAndSave({
    userId: userId1,
    cardName: 'Black Lotus',
    baseFilters: {
      maxEuroCents: 1000,
      minCondition: 'played',
      printings: [
        { setName: '', setCode: 'LEA', collectorNum: '233', url: '' },
        { setName: '', setCode: 'LEB', collectorNum: '233', url: '' },
      ],
    },
    marketFilters: { market: 'cardtrader' },
  })

  const m2 = await repo.createAndSave({
    userId: userId2,
    cardName: 'Lightning Bolt',
    baseFilters: {
      maxEuroCents: 200,
      language: 'EN',
      minCondition: 'played',
      printings: [
        { setName: '', setCode: 'LEA', collectorNum: '100', url: '' },
        { setName: '', setCode: 'LEB', collectorNum: '101', url: '' },
      ],
    },
    marketFilters: { market: 'cardtrader' },
  })

  const user1Monitors = await repo.findByUserId(userId1)
  assert.ok(user1Monitors.some(monitor => monitor.id === m1.id))

  const allMonitors = await repo.getAll()
  assert.deepEqual(
    allMonitors.map(m => m.id).toSorted(),
    [m1.id, m2.id].toSorted(),
  )

  await repo.delete(m1.id)
  await repo.delete(m2.id)
})

void test('matches only valid monitor listings', () => {
  const monitor = new CardMonitor(
    0,
    'user1',
    'Black Lotus',
    new MonitorBaseFilters({
      maxEuroCents: 1000,
      printings: [
        { setName: '', setCode: 'LEA', collectorNum: '233', url: '' },
        { setName: '', setCode: 'LEB', collectorNum: '233', url: '' },
      ],
    }),
    MonitorMarketFilters.create({
      market: 'cardtrader',
      ctZero: true,
    }),
    Temporal.Now.plainDateISO(),
  )

  const l1 = new CardListing(1,
    {
      name: 'Black Lotus',
      euroCents: 1500,
      condition: 'near-mint',
      language: 'en',
      foil: false,
      printing: new CardPrinting({ setName: '', setCode: 'LEA', collectorNum: '233', url: '' }),
      seller: '',
    },
    { market: 'cardtrader', ctZero: true },
  )
  const l2 = new CardListing(2,
    {
      name: 'Lightning Bolt',
      euroCents: 1,
      condition: 'near-mint',
      language: 'en',
      foil: true,
      printing: new CardPrinting({ setName: '', setCode: 'LEA', collectorNum: '100', url: '' }),
      seller: '',
    },
    { market: 'cardtrader', ctZero: true },
  )
  const l3 = new CardListing(3,
    {
      name: 'Black Lotus',
      euroCents: 1000,
      condition: 'near-mint',
      language: 'en',
      foil: false,
      printing: new CardPrinting({ setName: '', setCode: 'LEB', collectorNum: '233', url: '' }),
      seller: '',
    },
    { market: 'cardtrader', ctZero: true },
  )
  const l4 = new CardListing(4,
    {
      name: 'Black Lotus',
      euroCents: 1000,
      condition: 'near-mint',
      language: 'en',
      foil: true,
      printing: new CardPrinting({ setName: '', setCode: 'LEB', collectorNum: '233', url: '' }),
      seller: '',
    },
    { market: 'cardtrader', ctZero: true },
  )
  const l5 = new CardListing(5,
    {
      name: 'Black Lotus',
      euroCents: 1000,
      condition: 'near-mint',
      language: 'en',
      foil: true,
      printing: new CardPrinting({ setName: '', setCode: 'LEB', collectorNum: '233', url: '' }),
      seller: '',
    },
    { market: 'cardtrader', ctZero: false },
  )

  monitor.match([l1, l2, l3, l4, l5])

  const matchedIds = (monitor.events[0] as CardMonitorMatched).listings.map(listing => listing.id)
  assert.deepEqual(matchedIds, [3, 4])
})

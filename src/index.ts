import type { Card, CardMonitorRepository } from '@/core'
import { DbUserRepository } from '@/drizzle'
import { GrammyInputPort, GrammyOutputPort } from '@/grammy'
import { RedisStateMachineStorage } from '@/redis'
import { ScryfallApis, ScryfallCatalog } from '@/scryfall'
import { User, UserRegistrationUseCase, type UserRepository } from '@/user'
import { BotUI } from './bot-ui/bot-ui'
import { CardTraderApis } from './cardtrader/apis'
import { DbCardMonitorRepository } from './drizzle/repositories/card-monitor-repository'

class TestUserRepository implements UserRepository {
  private readonly users = new Map<string, User>()

  findById(id: string): Promise<User | undefined> {
    let user = this.users.get(id)
    if (user === undefined) {
      user = new User(id)
      this.users.set(id, user)
    }
    return Promise.resolve(user)
  }

  save(user: User): Promise<void> {
    this.users.set(user.id, user)
    return Promise.resolve()
  }
}

// Compose dependencies
const scryfallApis = new ScryfallApis({ timeoutMs: 7000, retries: 3 })
const catalog = new ScryfallCatalog(scryfallApis)
const userRepository = new DbUserRepository()
const userRegistrationUseCase = new UserRegistrationUseCase(userRepository)
const botUI = new BotUI(
  new RedisStateMachineStorage(),
  new GrammyInputPort(),
  new GrammyOutputPort(),
  userRegistrationUseCase,
  catalog,
)

// Example usage of the CardCatalog

async function testCardCatalog() {
  const start = new Date()
  const prototype = await catalog.fuzzySearch('subtle')
  if (prototype === undefined)
    return
  const card = await catalog.getCard(prototype.name)
  const end = new Date()
  console.log(`${(end.getTime() - start.getTime())}ms`)
  console.log(card)
}

// testCardCatalog()
//   .then(() => {
//     testCardCatalog()
//       .then(() => {
//         void testCardCatalog()
//       })
//       .catch(console.error)
//   })
//   .catch(console.error)

function testBotUI() {
  botUI.start()
}

testBotUI()

async function testCardTraderApis() {
  const cardTraderApis = new CardTraderApis({ timeoutMs: 7000, retries: 3 })
  const expansions = await cardTraderApis.expansions()
  console.log(expansions)
  const expansionId = expansions?.[0]?.id
  if (expansionId === undefined)
    return
  const blueprints = await cardTraderApis.blueprints(expansionId)
  console.log(blueprints)
  const expansionProducts = await cardTraderApis.marketplaceProducts({ expansion_id: expansionId})
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
    targetMarkets: ['cardtrader'],
    baseFilters: {
      maxEuroCents: 1000,
      printings: [
        { setCode: 'LEA', collectorNum: '233' },
        { setCode: 'LEB', collectorNum: '233' },
      ],
    },
    marketFilters: {},
  })
  console.log(m1)
  const m2 = await repo.createAndSave({
    userId: userId2,
    cardName: 'Lightning Bolt',
    targetMarkets: ['cardtrader'],
    baseFilters: {
      maxEuroCents: 200,
      printings: [
        { setCode: 'LEA', collectorNum: '100' },
        { setCode: 'LEB', collectorNum: '101' },
      ],
    },
    marketFilters: {},
  })
  console.log(m2)
  const user1Monitors = await repo.findByUserId(userId1)
  console.log(user1Monitors)
  const allMonitors = await repo.getAll()
  console.log(allMonitors)
  await repo.delete(m2.id)
}

// testCardMonitorRepository().catch(console.error)

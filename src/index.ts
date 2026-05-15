import { DbUserRepository } from '@/drizzle'
import { GrammyInputPort, GrammyOutputPort } from '@/grammy'
import { RedisStateMachineStorage } from '@/redis'
import { ScryfallApis, ScryfallCatalog } from '@/scryfall'
import { User, UserRegistrationUseCase, type UserRepository } from '@/user'
import { BotUI } from './bot-ui/bot-ui'
import { CardTraderApis } from './cardtrader/apis'

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
  const expansionProducts = await cardTraderApis.marketplaceProducts(expansionId)
  console.log(expansionProducts)
  const blueprintId = blueprints?.[0]?.id
  if (blueprintId === undefined)
    return
  const blueprintProducts = await cardTraderApis.marketplaceProducts(undefined, blueprintId)
  console.log(blueprintProducts)
}

// testCardTraderApis().catch(console.error)

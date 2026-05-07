import { ScryfallApis, ScryfallCatalog } from '@/scryfall'
import { User, type UserRepository } from '@/user'
import { BotUI } from './bot-ui/bot-ui'
import { GrammyInputPort } from './grammy/input-port'
import { GrammyOutputPort } from './grammy/output-port'
import { RedisStateMachineStorage } from './redis'

class TestUserRepository implements UserRepository {
  private readonly users = new Map<string, User>()

  findById(id: string): User | undefined {
    let user = this.users.get(id)
    if (user === undefined) {
      user = new User(id)
      this.users.set(id, user)
    }
    return user
  }

  save(user: User) {
    this.users.set(user.id, user)
  }
}

// Compose dependencies
const scryfallApis = new ScryfallApis({ timeoutMs: 7000, retries: 3 })
const catalog = new ScryfallCatalog(scryfallApis)
const botUI = new BotUI(
  new RedisStateMachineStorage(),
  new GrammyInputPort(),
  new GrammyOutputPort(),
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

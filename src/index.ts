import { ScryfallApis, ScryfallCatalog } from '@/scryfall'
import type { CardCatalog } from '@/search'
import { User, type UserRepository } from '@/user'
import { GRAMMY_BOT } from './grammy'
import { GrammyInputPort } from './grammy/input-port'
import { GrammyOutputPort } from './grammy/output-port'
import { SearchInitiatedPresenter, SearchInitiatedUseCase, type SearchInitiatedView, type SearchInitiatedViewModel } from './search/search-initiated'

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

class ConsoleSearchInitiatedView implements SearchInitiatedView {
  render(vm: SearchInitiatedViewModel): void {
    console.log(`Search initiated for user ${vm.recipientId}`)
  }
}

class BotSearchInitiatedView implements SearchInitiatedView {
  render(vm: SearchInitiatedViewModel): void {
    void GRAMMY_BOT.api.sendMessage(vm.recipientId, 'Search initiated')
  }
}

// Compose dependencies
const scryfallApis = new ScryfallApis({ timeoutMs: 7000, retries: 3 })
const catalog: CardCatalog = new ScryfallCatalog(scryfallApis)
const userRepo: UserRepository = new TestUserRepository()
const consoleSearchInitiatedView: SearchInitiatedView = new ConsoleSearchInitiatedView()
const consoleSearchInitiatedPresenter = new SearchInitiatedPresenter(consoleSearchInitiatedView)
const consoleSearchInitiatedUseCase = new SearchInitiatedUseCase(userRepo, consoleSearchInitiatedPresenter)
const botSearchInitiatedView: SearchInitiatedView = new BotSearchInitiatedView()
const botSearchInitiatedPresenter = new SearchInitiatedPresenter(botSearchInitiatedView)
const botSearchInitiatedUseCase = new SearchInitiatedUseCase(userRepo, botSearchInitiatedPresenter)

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

testCardCatalog()
  .then(() => {
    testCardCatalog()
      .then(() => {
        void testCardCatalog()
      })
      .catch(console.error)
  })
  .catch(console.error)

// Example usage of the SearchInitiatedUseCase

function testSearchInitiatedUseCaseOnConsole() {
  const userBefore = userRepo.findById('1')
  console.log('Before:', userBefore)
  consoleSearchInitiatedUseCase.execute({ userId: '1' })
  const userAfter = userRepo.findById('1')
  console.log('After:', userAfter)
}

testSearchInitiatedUseCaseOnConsole()

function setupSearchInitiatedUseCaseOnBot() {
  // Controller triggering the use case
  // GRAMMY_BOT.command('search', (ctx) => {
  //   if (ctx.from?.id === undefined)
  //     return
  //   const userId = ctx.from.id.toString()
  //   botSearchInitiatedUseCase.execute({ userId })
  // })
  const inputPort = new GrammyInputPort()
  const outputPort = new GrammyOutputPort()
  inputPort.onCommand('search', async (context) => {
    await outputPort.sendMessage(context.chatId, `Received search command`)
  })
  inputPort.onMessage(async (context) => {
    await outputPort.sendMessage(context.chatId, `Received message: ${context.text}`)
  })
}

setupSearchInitiatedUseCaseOnBot()

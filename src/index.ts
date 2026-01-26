import { ScryfallApis, ScryfallCatalog } from '@/scryfall'
import type { CardCatalog } from '@/search'
import { User, type UserRepository } from '@/user'
import { SearchInitiatedPresenter, SearchInitiatedUseCase, type SearchInitiatedView, type SearchInitiatedViewModel } from './search/search-initiated'

class TestUserRepository implements UserRepository {
  private readonly users = (() => {
    const users = new Map<string, User>()
    users.set('1', new User('1'))
    users.set('2', new User('2'))
    users.set('3', new User('3'))
    return users
  })()

  findById(id: string): User | undefined {
    return this.users.get(id)
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

// Compose dependencies
const scryfallApis = new ScryfallApis({ timeoutMs: 7000, retries: 3 })
const catalog: CardCatalog = new ScryfallCatalog(scryfallApis)
const userRepo: UserRepository = new TestUserRepository()
const searchInitiatedView: SearchInitiatedView = new ConsoleSearchInitiatedView()
const searchInitiatedPresenter = new SearchInitiatedPresenter(searchInitiatedView)
const searchInitiatedUseCase = new SearchInitiatedUseCase(userRepo, searchInitiatedPresenter)

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

function testSearchInitiatedUseCase() {
  const userBefore = userRepo.findById('1')
  console.log('Before:', userBefore)
  searchInitiatedUseCase.execute({ userId: '1' })
  const userAfter = userRepo.findById('1')
  console.log('After:', userAfter)
}

testSearchInitiatedUseCase()

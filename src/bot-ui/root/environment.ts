import type { SearchRequestedUseCase } from '@/search'
import type { BotOutputPort } from '../bot-output'
import type { SearchRequestedPresenter } from '../search/search-requested-presenter'

declare module '../bot-environment' {
  interface BotEnvironment {
    outputPort: BotOutputPort
    searchRequestedUseCase: SearchRequestedUseCase
    searchRequestedPresenter: SearchRequestedPresenter
  }
}

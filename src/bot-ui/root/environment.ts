import type { ExactSearchRequestedUseCase, SearchRequestedUseCase } from '@/search'
import type { PrintingsSelectionPresenter } from '../add-monitor/printings-selection-presenter'
import type { BotOutputPort } from '../bot-output'
import type { SearchRequestedPresenter } from '../search/search-requested-presenter'

declare module '../bot-environment' {
  interface BotEnvironment {
    outputPort: BotOutputPort
    searchRequestedUseCase: SearchRequestedUseCase
    searchRequestedPresenter: SearchRequestedPresenter
    exactSearchRequestedUseCase: ExactSearchRequestedUseCase
    printingsSelectionPresenter: PrintingsSelectionPresenter
  }
}

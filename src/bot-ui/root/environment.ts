import type { ExactSearchRequestedUseCase, FuzzySearchRequestedUseCase } from '@/search'
import type { PrintingsSelectionPresenter } from '../add-monitor/printings-selection-presenter'
import type { BotOutputPort } from '../bot-output'
import type { FuzzySearchPresenter } from '../search/fuzzy-search-presenter'

declare module '../bot-environment' {
  interface BotEnvironment {
    outputPort: BotOutputPort
    fuzzySearchRequestedUseCase: FuzzySearchRequestedUseCase
    fuzzySearchPresenter: FuzzySearchPresenter
    exactSearchRequestedUseCase: ExactSearchRequestedUseCase
    printingsSelectionPresenter: PrintingsSelectionPresenter
  }
}

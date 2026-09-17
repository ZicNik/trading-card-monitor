import type { AddMonitorUseCase, ExactSearchRequestedUseCase, FuzzySearchRequestedUseCase } from '@/use-cases'

import type { MonitorAddedPresenter } from '../add-monitor/monitor-added-presenter'
import type { PrintingsSelectionPresenter } from '../add-monitor/printings-selection-presenter'
import type { FuzzySearchPresenter } from '../search/fuzzy-search-presenter'

declare module '../bot-environment' {
  interface BotEnvironment {
    addMonitorUseCase: AddMonitorUseCase
    monitorAddedPresenter: MonitorAddedPresenter
    fuzzySearchRequestedUseCase: FuzzySearchRequestedUseCase
    fuzzySearchPresenter: FuzzySearchPresenter
    exactSearchRequestedUseCase: ExactSearchRequestedUseCase
    printingsSelectionPresenter: PrintingsSelectionPresenter
  }
}

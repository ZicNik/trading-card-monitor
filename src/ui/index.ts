import { BotUI, type BotEnvironment, type StateMachineStorage } from '@/bot-ui'
import type { BotInputHandler, BotInputPort } from '@/bot-ui/input'
import type { BotOutputPort } from '@/bot-ui/output'
import type { CardMonitorRepository } from '@/core'
import { CardCatalog } from '@/search'
import { AddMonitorUseCase, ExactSearchRequestedUseCase, FuzzySearchRequestedUseCase, UserRegistrationUseCase } from '@/use-cases'
import type { UserRepository } from '@/user'
import { MonitorAddedPresenter } from './add-monitor/monitor-added-presenter'
import { PrintingsSelectionPresenter } from './add-monitor/printings-selection-presenter'
import { rootMachine } from './root/root-machine'
import { FuzzySearchPresenter } from './search/fuzzy-search-presenter'

export type UIConfig = Readonly<{
  inputPort: BotInputPort
  outputPort: BotOutputPort
  storage: StateMachineStorage
  userRepo: UserRepository
  monitorRepo: CardMonitorRepository
  cardCatalog: CardCatalog
}>

export function createUI({ inputPort, outputPort, storage, userRepo, monitorRepo, cardCatalog }: UIConfig): BotUI {
  return new BotUI({
    inputPort,
    storage,
    rootMachine,
    environment: () => createEnvironment({ outputPort, monitorRepo, cardCatalog }),
    commands: ['monitor', 'search', 'list'],
    onAnyInput: { handler: userRegistrationHandler(new UserRegistrationUseCase(userRepo)) },
  })
}

function createEnvironment({ outputPort, monitorRepo, cardCatalog }: {
  outputPort: BotOutputPort
  monitorRepo: CardMonitorRepository
  cardCatalog: CardCatalog
}): BotEnvironment {
  const monitorAddedPresenter = new MonitorAddedPresenter()
  const addMonitorUseCase = new AddMonitorUseCase(monitorAddedPresenter, monitorRepo)
  const fuzzySearchPresenter = new FuzzySearchPresenter()
  const fuzzySearchRequestedUseCase = new FuzzySearchRequestedUseCase(fuzzySearchPresenter, cardCatalog)
  const printingsSelectionPresenter = new PrintingsSelectionPresenter()
  const exactSearchRequestedUseCase = new ExactSearchRequestedUseCase(printingsSelectionPresenter, cardCatalog)
  return {
    outputPort,
    addMonitorUseCase,
    monitorAddedPresenter,
    fuzzySearchRequestedUseCase,
    fuzzySearchPresenter,
    exactSearchRequestedUseCase,
    printingsSelectionPresenter,
  }
}

function userRegistrationHandler(useCase: UserRegistrationUseCase): BotInputHandler {
  return async (context) => {
    if (context.userId !== undefined)
      await useCase.execute({ id: context.userId })
  }
}

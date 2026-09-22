import type { RootMachineEvent, StateMachineStorage } from '@/bot-ui'
import type { BotInputPort } from '@/bot-ui/input'
import type { BotOutputPort } from '@/bot-ui/output'
import type { CardMonitorRepository } from '@/core'
import type { CardCatalog } from '@/search'
import { AddMonitorUseCase, ExactSearchRequestedUseCase, FuzzySearchRequestedUseCase, UserRegistrationUseCase } from '@/use-cases'
import { createActor, waitFor, type ActorRefFromLogic, type AnyActorRef, type AnyStateMachine, type Snapshot } from 'xstate'
import { MonitorAddedPresenter } from './add-monitor/monitor-added-presenter'
import { PrintingsSelectionPresenter } from './add-monitor/printings-selection-presenter'
import { rootMachine } from './root/root-machine'
import { FuzzySearchPresenter } from './search/fuzzy-search-presenter'

export class BotUI {
  constructor(
    private readonly storage: StateMachineStorage,
    private readonly inputPort: BotInputPort,
    private readonly outputPort: BotOutputPort,
    private readonly userRegistrationUseCase: UserRegistrationUseCase,
    private readonly monitorRepo: CardMonitorRepository,
    private readonly cardCatalog: CardCatalog,
  ) {}

  start(): void {
    this.inputPort.onAny(context => this.handleUserRegistration(context.userId), {});
    ['monitor', 'search', 'list'].forEach((command) => {
      this.inputPort.onCommand(command, context => this.send(context.chatId, { type: 'command', command }), {})
    })
    this.inputPort.onMessage(context => this.send(context.chatId, { type: 'message', text: context.text }), {})
    this.inputPort.onButtonPress(context => this.send(context.chatId, { type: 'buttonPress', payload: context.payload }), {})
  }

  private async handleUserRegistration(id?: string): Promise<void> {
    if (id !== undefined)
      await this.userRegistrationUseCase.execute({ id })
  }

  private async send(chatId: string, event: RootMachineEvent): Promise<void> {
    const snapshot = await this.storage.hydrate(chatId)
    const monitorAddedPresenter = new MonitorAddedPresenter()
    const addMonitorUseCase = new AddMonitorUseCase(monitorAddedPresenter, this.monitorRepo)
    const fuzzySearchPresenter = new FuzzySearchPresenter()
    const fuzzySearchRequestedUseCase = new FuzzySearchRequestedUseCase(fuzzySearchPresenter, this.cardCatalog)
    const printingsSelectionPresenter = new PrintingsSelectionPresenter()
    const exactSearchRequestedUseCase = new ExactSearchRequestedUseCase(printingsSelectionPresenter, this.cardCatalog)
    const actor = createActor(rootMachine, {
      input: { chatId },
      ...(snapshot !== undefined ? { snapshot } : {}),
    })
    // Initialize the actor system's environment
    actor.system.env = {
      outputPort: this.outputPort,
      addMonitorUseCase,
      monitorAddedPresenter,
      fuzzySearchRequestedUseCase,
      fuzzySearchPresenter,
      exactSearchRequestedUseCase,
      printingsSelectionPresenter,
    }
    actor.start()
    actor.send(event)
    await waitForSettled(actor)
    const newSnapshot = actor.getPersistedSnapshot()
    actor.stop()
    await this.storage.store(chatId, newSnapshot)
  }
}

async function waitForSettled(actor: ActorRefFromLogic<AnyStateMachine>): Promise<void> {
  const actors = getAllSystemActors(actor)
  if (actors.every(isStateMachine))
    return
  const controller = new AbortController()
  try {
    const signal = controller.signal
    const snapshotChanges = actors.map((actor) => {
      const initialSnapshot = actor.getSnapshot() as Snapshot<unknown>
      return waitFor(actor, snapshot => snapshot !== initialSnapshot, { signal })
    })
    await Promise.any(snapshotChanges)
  }
  finally {
    controller.abort()
  }
  await waitForSettled(actor)
}

function getAllSystemActors(root: AnyActorRef): AnyActorRef[] {
  if (isStateMachine(root)) {
    const children = Object.values(root.getSnapshot().children as Record<string, AnyActorRef>)
    return [root, ...children.flatMap(getAllSystemActors)]
  }
  return [root]
}

function isStateMachine(actor: AnyActorRef): actor is ActorRefFromLogic<AnyStateMachine> {
  return 'value' in actor.getSnapshot()
}

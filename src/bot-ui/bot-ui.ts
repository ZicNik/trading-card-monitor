import { SearchRequestedUseCase, type CardCatalog } from '@/search'
import { createActor, waitFor, type ActorRefFromLogic, type AnyActorRef, type AnyStateMachine, type Snapshot } from 'xstate'
import type { BotInputPort } from './bot-input'
import type { BotOutputPort } from './bot-output'
import { rootMachine, type RootMachineEvent } from './root/root-machine'
import { SearchRequestedPresenter } from './search/search-requested-presenter'
import type { StateMachineStorage } from './state-machine-storage'

export class BotUI {
  constructor(
    private readonly storage: StateMachineStorage,
    private readonly inputPort: BotInputPort,
    private readonly outputPort: BotOutputPort,
    private readonly cardCatalog: CardCatalog,
  ) {}

  start(): void {
    this.inputPort.onCommand('search', context => this.send(context.chatId, { type: 'command', command: 'search' }), {})
    this.inputPort.onMessage(context => this.send(context.chatId, { type: 'message', text: context.text }), {})
  }

  private async send(chatId: string, event: RootMachineEvent): Promise<void> {
    const snapshot = await this.storage.hydrate(chatId)
    const searchRequestedPresenter = new SearchRequestedPresenter()
    const searchRequestedUseCase = new SearchRequestedUseCase(searchRequestedPresenter, this.cardCatalog)
    const actor = createActor(rootMachine, {
      input: {
        outputPort: this.outputPort,
        searchRequestedUseCase,
        searchRequestedPresenter,
        chatId,
      },
      ...(snapshot !== undefined ? { snapshot } : {}),
    })
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

import { createActor, waitFor, type ActorRefFromLogic, type AnyActorRef, type AnyStateMachine } from 'xstate'
import type { BotInputPort } from './bot-input'
import { rootMachine, type RootMachineEvent } from './root/root-machine'
import type { StateMachineStorage } from './state-machine-storage'

export class BotUI {
  constructor(
    private readonly inputPort: BotInputPort,
    private readonly storage: StateMachineStorage,
  ) {}

  start(): void {
    this.inputPort.onCommand('search', async (context) => {
      await this.send(context.chatId, { type: 'command', command: 'search' })
    }, {})
    this.inputPort.onMessage(async (context) => {
      await this.send(context.chatId, { type: 'message', text: context.text })
    }, {})
  }

  private async send(chatId: string, event: RootMachineEvent): Promise<void> {
    const snapshot = await this.storage.hydrate(chatId)
    const actor = createActor(rootMachine, {
      input: { chatId },
      ...(snapshot !== undefined ? { snapshot } : {}),
    })
    actor.start()
    actor.send(event)
    await waitFor(actor, () => !isActorSystemBusy(actor), { timeout: 30_000 })
    const newSnapshot = actor.getPersistedSnapshot()
    actor.stop()
    await this.storage.store(chatId, newSnapshot)
  }
}

function isActorSystemBusy(actor: AnyActorRef): boolean {
  function isStateMachineActor(actor: AnyActorRef): actor is ActorRefFromLogic<AnyStateMachine> {
    return 'machine' in actor.getSnapshot()
  }
  if (!isStateMachineActor(actor))
    return true
  return Object.values(actor.getSnapshot().children as Record<string, AnyActorRef>)
    .some(child => isActorSystemBusy(child))
}

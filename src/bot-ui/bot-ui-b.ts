import { createActor, waitFor, type ActorRefFromLogic, type AnyActorRef, type AnyStateMachine, type Snapshot } from 'xstate'

import type { BotEnvironment } from './bot-environment'
import type { BotInput, BotInputFilter, BotInputHandler, BotInputPort } from './bot-input'
import type { RootMachine } from './root-machine'
import type { StateMachineStorage } from './state-machine-storage'

/**
 * @param environment Note that this factory will be called every time the Bot UI *wakes up*. That is essentially at any user input.
 */
export type BotUIConfig = Readonly<{
  rootMachine: RootMachine
  environment: BotEnvironmentFactory
  storage: StateMachineStorage
  inputPort: BotInputPort
  commands?: string[]
  onAnyInput?: OnAnyInput
}>

export type BotEnvironmentFactory = () => BotEnvironment

export interface OnAnyInput { handler: BotInputHandler, filter?: BotInputFilter }

export class BotUI {
  private readonly rootMachine: RootMachine
  private readonly envFactory: BotEnvironmentFactory
  private readonly storage: StateMachineStorage
  private readonly inputPort: BotInputPort
  private readonly commands: string[] | undefined
  private readonly onAnyInput: OnAnyInput | undefined

  constructor({ rootMachine, environment: envFactory, storage, inputPort, commands, onAnyInput }: BotUIConfig) {
    this.rootMachine = rootMachine
    this.envFactory = envFactory
    this.storage = storage
    this.inputPort = inputPort
    this.commands = commands
    this.onAnyInput = onAnyInput
  }

  start(): void {
    if (this.onAnyInput !== undefined) {
      this.inputPort.onAny(this.onAnyInput.handler,
        { ...(this.onAnyInput.filter !== undefined ? { filter: this.onAnyInput.filter } : {}) })
    }
    this.commands?.forEach((command) => {
      this.inputPort.onCommand(command, context => this.send(context.chatId, { type: 'command', command: context.command }), {})
    })
    this.inputPort.onMessage(context => this.send(context.chatId, { type: 'message', text: context.text }), {})
    this.inputPort.onButtonPress(context => this.send(context.chatId, { type: 'buttonPress', payload: context.payload }), {})
  }

  private async send(chatId: string, event: BotInput): Promise<void> {
    const snapshot = await this.storage.hydrate(chatId)
    const actor = createActor(this.rootMachine, {
      input: { chatId },
      ...(snapshot !== undefined ? { snapshot } : {}),
    })
    actor.system.env = this.envFactory()
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

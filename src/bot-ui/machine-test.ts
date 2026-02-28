import { createActor, waitFor, type ActorRefFromLogic, type AnyActorRef, type AnyStateMachine, type Snapshot } from 'xstate'
import { rootMachine } from './root/root-machine'

const storage = new Map<string, string>()

async function onCommandReceived(context: { chatId: string, command: string }): Promise<void> {
  const snapshotString = storage.get(context.chatId)
  const actor = createActor(rootMachine, {
    input: { chatId: context.chatId },
    ...(snapshotString !== undefined ? { snapshot: JSON.parse(snapshotString) as Snapshot<unknown> } : {}),
    // inspect: console.log,
  })
  actor.start()
  actor.send({ type: 'command', command: context.command })
  await waitFor(actor, () => !isActorSystemBusy(actor), { timeout: 60_000 })
  const newSnapshot = actor.getPersistedSnapshot()
  actor.stop()
  storage.set(context.chatId, JSON.stringify(newSnapshot))
  console.log('Updated snapshot for chatId', context.chatId, ':', newSnapshot)
}

async function onMessageReceived(context: { chatId: string, text: string }): Promise<void> {
  const snapshotString = storage.get(context.chatId)
  const actor = createActor(rootMachine, {
    input: { chatId: context.chatId },
    ...(snapshotString !== undefined ? { snapshot: JSON.parse(snapshotString) as Snapshot<unknown> } : {}),
    // inspect: console.log,
  })
  actor.start()
  actor.send({ type: 'message', text: context.text })
  await waitFor(actor, () => !isActorSystemBusy(actor), { timeout: 60_000 })
  const newSnapshot = actor.getPersistedSnapshot()
  actor.stop()
  storage.set(context.chatId, JSON.stringify(newSnapshot))
  console.log('Updated snapshot for chatId', context.chatId, ':', newSnapshot)
}

export async function testSM(): Promise<void> {
  const chatId = 'user-123'
  await onCommandReceived({ chatId, command: 'search' })
  await onMessageReceived({ chatId, text: 'QUERY_1' })
  await onCommandReceived({ chatId, command: 'search' })
  await onMessageReceived({ chatId, text: 'QUERY_2' })
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

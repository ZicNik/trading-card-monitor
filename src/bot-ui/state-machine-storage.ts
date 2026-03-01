import type { Snapshot } from 'xstate'

export interface StateMachineStorage {
  hydrate(chatId: string): Promise<Snapshot<unknown> | undefined>
  store(chatId: string, snapshot: Snapshot<unknown>): Promise<void>
}

export class InMemoryStateMachineStorage implements StateMachineStorage {
  private readonly map = new Map<string, Snapshot<unknown>>()

  hydrate(chatId: string): Promise<Snapshot<unknown> | undefined> {
    return Promise.resolve(this.map.get(chatId))
  }

  store(chatId: string, snapshot: Snapshot<unknown>): Promise<void> {
    this.map.set(chatId, snapshot)
    return Promise.resolve()
  }
}

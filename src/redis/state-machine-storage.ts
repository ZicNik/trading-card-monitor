import type { StateMachineStorage } from '@/bot-ui/state-machine-storage'
import type { Snapshot } from 'xstate'
import { KEY_VALUE_STORE } from './key-value-store'

export class RedisStateMachineStorage implements StateMachineStorage {
  async hydrate(chatId: string): Promise<Snapshot<unknown> | undefined> {
    const snapshotString = await KEY_VALUE_STORE.get(chatId)
    if (snapshotString === null)
      return undefined
    return JSON.parse(snapshotString) as Snapshot<unknown>
  }

  async store(chatId: string, snapshot: Snapshot<unknown>): Promise<void> {
    const snapshotString = JSON.stringify(snapshot)
    await KEY_VALUE_STORE.set(chatId, snapshotString)
  }
}

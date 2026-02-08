export interface StateStorage {
  hydrate(userId: string): Promise<Record<string, unknown>>
  store(userId: string, state: Record<string, unknown>): Promise<void>
}

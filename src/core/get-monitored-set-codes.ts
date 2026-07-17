export type GetMonitoredSetCodesResult = readonly string[]

/** Retrieves all the set codes found among currently monitored cards, without duplicates. */
export interface GetMonitoredSetCodesQuery {
  execute(): Promise<GetMonitoredSetCodesResult>
}

/** A card to be monitored according to a set of parameters. */
export class CardMonitor {
  constructor(
    public readonly id: number,
    public readonly cardId: string,
    public readonly userId: string,
  ) {}
}

// MARK: - Repository

export interface CardMonitorRepository {
  findById(id: number): Promise<CardMonitor | undefined>
  save(cardMonitor: CardMonitor): Promise<void>
  delete(id: number): Promise<void>
}

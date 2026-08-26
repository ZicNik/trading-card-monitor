import type { CardListing, CardListingCatalog, CardMonitorRepository, DomainEvent, DomainEventPublisher } from '@/core'

export class ProcessActiveMonitorsUseCase {
  constructor(
    private readonly repo: CardMonitorRepository,
    private readonly catalog: CardListingCatalog,
    private readonly publisher: DomainEventPublisher,
  ) {}

  async execute(): Promise<void> {
    const monitors = await this.repo.getAll()
    const cardNames = new Set(monitors.map(m => m.cardName))
    const listingsByCardName = new Map<string, CardListing[]>()
    for (const name of cardNames)
      listingsByCardName.set(name, await this.catalog.findByCardName(name))
    const events: DomainEvent[] = []
    for (const monitor of monitors) {
      const listings = listingsByCardName.get(monitor.cardName) ?? []
      monitor.match(listings)
      events.push(...monitor.events)
      monitor.clearEvents()
    }
    if (events.length !== 0)
      await this.publisher.publish(...events)
  }
}

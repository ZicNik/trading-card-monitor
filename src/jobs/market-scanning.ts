import type { CardListingCatalog, CardMonitorRepository, DomainEventPublisher } from '@/core'
import { ProcessActiveMonitorsUseCase } from '@/use-cases'
import nodeCron from 'node-cron'

/** Launches a cron job that periodically scans all the markets to look for listings that match active monitors.
 *
 * @see {@link CardTraderDbSynchronizer}
 */
export function startMarketScanning(
  dependencies: {
    cardMonitorRepo: CardMonitorRepository
    cardListingCatalog: CardListingCatalog
    publisher: DomainEventPublisher

  }): void {
  const useCase = new ProcessActiveMonitorsUseCase(
    dependencies.cardMonitorRepo,
    dependencies.cardListingCatalog,
    dependencies.publisher,
  )
  nodeCron.schedule('*/10 * * * *', () => useCase.execute(), { noOverlap: true })
}

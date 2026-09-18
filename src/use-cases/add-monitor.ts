import type { CardMonitorRepository, MarketType, MonitorBaseFiltersProps, MonitorMarketFiltersProps } from '@/core'

export type AddMonitorInput = Readonly<{
  userId: string
  cardName: string
  baseFilters: MonitorBaseFiltersProps
  marketFilters: MonitorMarketFiltersProps
}>

export type AddMonitorOutput = Readonly<{
  id: number
  userId: string
  cardName: string
  expiration: Temporal.PlainDate
  market: MarketType
}>

export interface AddMonitorOutputPort {
  present(output: AddMonitorOutput): void
}

export class AddMonitorUseCase {
  constructor(
    private readonly outputPort: AddMonitorOutputPort,
    private readonly repo: CardMonitorRepository,
  ) {}

  async execute(input: AddMonitorInput): Promise<void> {
    const monitor = await this.repo.createAndSave(input)
    this.outputPort.present({
      id: monitor.id,
      userId: monitor.userId,
      cardName: monitor.cardName,
      market: monitor.marketFilters.market,
      expiration: monitor.expiration,
    })
  }
}

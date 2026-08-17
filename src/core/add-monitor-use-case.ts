import type { CardMonitorRepository, MonitorBaseFilters } from './card-monitor'
import type { MonitorMarketFilters } from './market'

export type AddMonitorInput = Readonly<{
  userId: string
  cardName: string
  baseFilters: MonitorBaseFilters
  marketFilters: MonitorMarketFilters
}>

export type AddMonitorOutput = Readonly<{ id: number }>

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
    this.outputPort.present({ id: monitor.id })
  }
}

// MARK: - Utilities

export class AddMonitorDoNothingOutputPort implements AddMonitorOutputPort {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  present(_output: AddMonitorOutput): void {}
}

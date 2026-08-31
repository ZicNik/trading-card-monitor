import type { CardMonitorRepository } from '@/core'

export type MatchNotificationListingData = Readonly<{
  setCode: string
  collectorNum: string
  url: string
  euroCents: number
  foil: boolean
}>

export type NotifyCardMonitorMatchInput = Readonly<{
  monitorId: number
  listings: readonly MatchNotificationListingData[]
}>

export type NotifyCardMonitorMatchOutput = Readonly<{
  userId: string
  cardName: string
  listings: readonly MatchNotificationListingData[]
}>

export interface NotifyCardMonitorMatchOutputPort {
  present(output: NotifyCardMonitorMatchOutput): Promise<void>
}

export class NotifyCardMonitorMatchUseCase {
  constructor(
    private readonly outputPort: NotifyCardMonitorMatchOutputPort,
    private readonly monitorRepo: CardMonitorRepository,
  ) {}

  async execute(input: NotifyCardMonitorMatchInput): Promise<void> {
    const monitorId = input.monitorId
    const monitor = await this.monitorRepo.findById(monitorId)
    if (monitor === undefined)
      throw new Error(`No monitor found for id ${input.monitorId} while notifying match.`)
    await this.outputPort.present({
      userId: monitor.userId,
      cardName: monitor.cardName,
      listings: input.listings,
    })
    await this.monitorRepo.delete(monitorId)
  }
}

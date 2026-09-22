import { formatDate, formatMarket } from '@/common/utilities'
import type { MarketType } from '@/core'
import type { AddMonitorOutput, AddMonitorOutputPort } from '@/use-cases'

import type { MessageViewModel } from '../views'

type MonitorAddedState = Readonly<{
  cardName: string
  market: MarketType
  expiration: Temporal.PlainDate
}>
type MonitorAddedViewModel = MessageViewModel

export class MonitorAddedPresenter implements AddMonitorOutputPort {
  private state!: MonitorAddedState
  get vm(): MonitorAddedViewModel {
    return {
      text: `You are all set\\! _${this.state.cardName}_ will be tracked on ${formatMarket(this.state.market)} through *${formatDate(this.state.expiration)}*\\.
You will be notified as soon as a match is found\\.`,
      options: { formatting: 'markdown' },
    }
  }

  present(output: AddMonitorOutput): void {
    this.state = {
      cardName: output.cardName,
      market: output.market,
      expiration: output.expiration,
    }
  }
}

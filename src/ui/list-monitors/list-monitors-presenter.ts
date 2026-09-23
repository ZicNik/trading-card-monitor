import type { MessageViewModel } from '@/bot-ui/views'
import { formatCondition, formatDate, formatEuroCents } from '@/common/utilities'
import type { CardTraderDetailsRecap, GetActiveMonitorsOuputPort, GetActiveMonitorsResult, MarketDetailsRecap, MonitorRecap, PrintingRecap } from '@/use-cases'

type ListMonitorsState = GetActiveMonitorsResult

type ListMonitorsViewModel = readonly MessageViewModel[]

export class ListMonitorsPresenter implements GetActiveMonitorsOuputPort {
  private state!: ListMonitorsState
  get vm(): ListMonitorsViewModel {
    return this.state.length === 0
      ? [{ text: noMonitorsText }]
      : this.state.map(monitor => ({
          text: monitorText(monitor),
          options: { formatting: 'html', linkPreview: false },
        }))
  }

  present(result: GetActiveMonitorsResult): void {
    this.state = result
  }
}

const noMonitorsText = 'You have no active monitors, at the moment.'

function monitorText(monitor: MonitorRecap): string {
  return `<em>${monitor.cardName}</em>\n`
    + printingsListText(monitor.printings)
    + textFor('Max Price', monitor.maxEuroCents, formatEuroCents)
    + textFor('Min Condition', monitor.minCondition, c => formatCondition(c, monitor.marketDetails.market))
    + textForString('Language', monitor.language)
    + textForBoolean('Foil', monitor.foil)
    + marketDetailsText(monitor.marketDetails)
    + textFor('Valid through', monitor.expiration, formatDate)
}

function printingsListText(printings: readonly PrintingRecap[]): string {
  return printings.map(printingText).join('\n')
}

function printingText(p: PrintingRecap): string {
  return `<a href="${p.url}"><u>${p.setName}  [${p.setCode} ${p.collectorNum}]</u></a>`
}

function textFor<V>(title: string, value: V | undefined, formatting: (v: V) => string): string {
  return value === undefined ? '' : `\n<b>${title}:</b> ${formatting(value)}`
}

function textForString(title: string, value: string | undefined): string {
  return textFor(title, value, v => v)
}

function textForBoolean(title: string, value: boolean | undefined): string {
  return textFor(title, value, v => v ? 'Yes' : 'No')
}

function marketDetailsText(details: MarketDetailsRecap): string {
  switch (details.market) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case 'cardtrader': return cardtraderDetailsText(details)
  }
}

// MARK: - CardTrader

function cardtraderDetailsText(details: CardTraderDetailsRecap): string {
  return textForBoolean('CardTrader Zero', details.ctZero)
}

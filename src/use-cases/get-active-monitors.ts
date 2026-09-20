import type { CardTraderType } from '@/cardtrader'
import type { CardCondition } from '@/core'

export type GetActiveMonitorsQuery = Readonly<{
  userId: string
}>

export type GetActiveMonitorsResult = readonly MonitorRecap[]

export type MonitorRecap = Readonly<{
  id: number
  cardName: string
  printings: readonly PrintingRecap[]
  maxEuroCents: number
  minCondition?: CardCondition
  language?: string
  foil?: boolean
  marketDetails: MarketDetailsRecap
}>

export type PrintingRecap = Readonly<{
  setName: string
  setCode: string
  collectorNum: string
  url: string
}>

export type MarketDetailsRecap = CardTraderDetailsRecap

export type CardTraderDetailsRecap = Readonly<{
  market: CardTraderType
  ctZero?: boolean
}>

export interface GetActiveMonitorsReader {
  read(query: GetActiveMonitorsQuery): Promise<GetActiveMonitorsResult>
}

export interface GetActiveMonitorsOuputPort {
  present(result: GetActiveMonitorsResult): void
}

export class GetActiveMonitorsUseCase {
  constructor(
    private readonly reader: GetActiveMonitorsReader,
    private readonly outputPort: GetActiveMonitorsOuputPort,
  ) {}

  async execute(query: GetActiveMonitorsQuery): Promise<void> {
    this.outputPort.present(await this.reader.read(query))
  }
}

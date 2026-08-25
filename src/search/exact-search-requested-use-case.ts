import type { CardPrintingProps, MarketType } from '@/core'
import type { CardCatalog } from './card-catalog'

export type ExactSearchRequestedInput = Readonly<{
  cardName: string
  market?: MarketType
}>

export type ExactSearchRequestedOutput = Readonly<{
  cardName: string
  printings: readonly CardPrintingProps[]
}>

export interface ExactSearchRequestedOutputPort {
  present(output: ExactSearchRequestedOutput): void
}

export class ExactSearchRequestedUseCase {
  constructor(
    private readonly outputPort: ExactSearchRequestedOutputPort,
    private readonly catalog: CardCatalog,
  ) {}

  async execute(input: ExactSearchRequestedInput): Promise<void> {
    const card = await this.catalog.getCard(input.cardName, input.market)
    if (card === undefined)
      throw new Error(`Exact search of ${input.cardName} for ${input.market} market produced no result`)
    this.outputPort.present({
      cardName: card.name,
      printings: card.printings.map(p => p.toProps()),
    })
  }
}

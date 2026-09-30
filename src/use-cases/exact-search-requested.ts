import type { CardPrintingProps, MarketType } from '@/core'
import type { CardCatalog } from '@/search'

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
      throw new CardNotFoundError(input.cardName, input.market)
    this.outputPort.present({
      cardName: card.name,
      printings: card.printings.map(p => p.toProps()),
    })
  }
}

export class CardNotFoundError extends Error {
  constructor(
    readonly cardName: string,
    readonly market?: MarketType,
  ) {
    super(`Card "${cardName}" not found${market ? ` on "${market}" market` : ''}`)
    this.name = 'CardNotFoundError'
  }
}

import type { CardCatalog, CardPrototype } from '@/search'

export type FuzzySearchRequestedInput = string

export type FuzzySearchRequestedOutput = CardPrototype

export interface FuzzySearchRequestedOutputPort {
  present(output: FuzzySearchRequestedOutput): void
}

export class FuzzySearchRequestedUseCase {
  constructor(
    private readonly outputPort: FuzzySearchRequestedOutputPort,
    private readonly catalog: CardCatalog,
  ) {}

  async execute(input: FuzzySearchRequestedInput) {
    const prototype = await this.catalog.fuzzySearch(input)
    if (prototype === undefined)
      throw new Error(`Fuzzy search of ${input} produced no result`)
    this.outputPort.present(prototype)
  }
}

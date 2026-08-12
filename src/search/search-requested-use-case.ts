import type { CardCatalog } from './card-catalog'
import type { CardPrototype } from './card-prototype'

export type SearchRequestedInput = string

export type SearchRequestedOutput = CardPrototype

export interface SearchRequestedOutputPort {
  present(output: SearchRequestedOutput): void
}

export class SearchRequestedUseCase {
  constructor(
    private readonly outputPort: SearchRequestedOutputPort,
    private readonly catalog: CardCatalog,
  ) {}

  async execute(input: SearchRequestedInput) {
    const prototype = await this.catalog.fuzzySearch(input)
    if (prototype === undefined)
      throw new Error(`Fuzzy search of ${input} produced no result`)
    this.outputPort.present(prototype)
  }
}

import type { CardPrinting } from './card'
import type { ListingMarketAttributes } from './market'

export class CardListing {
  constructor(
    public readonly id: number,
    public readonly cardId: string,
    public baseAttributes: ListingBaseAttributes,
    public marketDetails: ListingMarketAttributes,
  ) {}
}

export type ListingBaseAttributes = Readonly<{
  euroCents: number
  foil: boolean
  printing: CardPrinting
  // condition: string,
  // language: string,
  // sellerCountry: string,
}>

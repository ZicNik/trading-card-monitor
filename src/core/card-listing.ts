import type { CardPrinting } from './card'
import type { ListingMarketAttributes, MarketType } from './market'

export class CardListing<M extends MarketType = MarketType> {
  constructor(
    public readonly id: number,
    public readonly cardId: string,
    public baseAttributes: ListingBaseAttributes,
    public marketDetails: ListingMarketAttributes<M>,
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

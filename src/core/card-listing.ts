import type { CardPrinting } from './card'
import type { ListingMarketAttributes, MarketType } from './market'

export class CardListing<M extends MarketType = MarketType> {
  constructor(
    public readonly id: number,
    public baseAttributes: ListingBaseAttributes,
    public marketDetails: ListingMarketAttributes<M>,
  ) {}
}

export type ListingBaseAttributes = Readonly<{
  name: string
  printing: CardPrinting
  url: string
  euroCents: number
  foil: boolean
  // condition: string,
  // language: string,
  // sellerCountry: string,
}>

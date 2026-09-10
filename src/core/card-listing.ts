import type { CardCondition, CardPrinting } from './card'
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
  euroCents: number
  condition: CardCondition
  language: string
  foil: boolean
  seller: string
  // condition: string,
  // language: string,
  // sellerCountry: string,
}>

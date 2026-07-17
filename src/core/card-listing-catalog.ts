import type { CardListing } from './card-listing'

/** Gateway for fetching listings available on the market. */
export interface CardListingCatalog {
  findByCardName(name: string): Promise<CardListing[]>
}

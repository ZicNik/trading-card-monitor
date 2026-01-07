import type { Card } from '@/core'
import type { CardPrototype } from './card-prototype'

/** Main gateway for consulting card data. */
export interface CardCatalog {

  /** Fuzzy-match (i.e., handling misspellings, typos, and partial words) a card name, returning a simplified view. */
  fuzzySearch(name: string): Promise<CardPrototype | undefined>

  /** Retrieve a card's detailed information by its exact name. */
  getCard(name: string): Promise<Card | undefined>
}

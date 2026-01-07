import type { Card } from '@/core'
import type { CardCatalog, CardPrototype } from '@/search'
import { ScryfallApis } from './apis'
import type { ScryfallCard } from './types'

export class ScryfallCatalog implements CardCatalog {
  constructor(private readonly apis: ScryfallApis) {}

  async fuzzySearch(name: string): Promise<CardPrototype | undefined> {
    const cached = fuzzySearchCache.get(name)
    if (cached !== undefined)
      return cached
    const result = await this.apis.cardsNamed(undefined, name)
    if (result === undefined)
      return undefined
    const prototype = toCardPrototype(result)
    fuzzySearchCache.put(prototype)
    return prototype
  }

  async getCard(name: string): Promise<Card | undefined> {
    const cached = getCardCache.get(name)
    if (cached !== undefined)
      return cached
    const result = await this.apis.cardsSearch(`!"${name}"`, 'prints')
    if (result === undefined)
      return undefined
    const card = toCard(result.data)
    if (card === undefined)
      return undefined
    getCardCache.set(name, card)
    return card
  }
}

// MARK: - Caches

class FuzzySearchCache {
  /** Keys are lowercase names. */
  private prototypes = new Map<string, CardPrototype>()

  get(name: string): CardPrototype | undefined {
    const lcName = name.toLowerCase()
    const key = this.prototypes.keys().find(k => k.startsWith(lcName))
    return key !== undefined ? this.prototypes.get(key) : undefined
  }

  put(prototype: CardPrototype) {
    this.prototypes.set(prototype.name.toLowerCase(), prototype)
  }
}

const fuzzySearchCache = new FuzzySearchCache()
const getCardCache = new Map<string, Card>()

// MARK: - Mappers

function toCardPrototype(card: ScryfallCard): CardPrototype {
  return {
    name: card.name,
    imgUrl: card.image_uris.small,
  }
}

/** Assumes all prints are of the same conceptual card. Any error results in `undefined`. */
function toCard(prints: ScryfallCard[]): Card | undefined {
  const name = prints[0]?.name
  if (name === undefined)
    return undefined
  return {
    name,
    printings: prints.map(p => ({
      setCode: p.set,
      collectorNum: p.collector_number,
    })),
  }
}

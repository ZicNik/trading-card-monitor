export type Card = Readonly<{
  name: string
  printings: readonly CardPrinting[]
}>

/** A card's specific iteration. */
export type CardPrinting = Readonly<{
  setCode: string
  collectorNum: string
}>

export const CardPrinting = {
  equals(a: CardPrinting, b: CardPrinting): boolean {
    return a.setCode === b.setCode && a.collectorNum === b.collectorNum
  },
}

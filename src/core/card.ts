export type Card = Readonly<{
  name: string
  printings: CardPrinting[]
}>

/** A card's specific iteration. */
export type CardPrinting = Readonly<{
  setCode: string
  collectorNum: string
}>

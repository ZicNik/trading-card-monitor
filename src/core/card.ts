import { ValueObject } from '@/common/utilities'

export class Card {
  readonly name: string
  printings: CardPrinting[]

  constructor(props: {
    name: string
    printings: CardPrinting[]
  }) {
    this.name = props.name
    this.printings = props.printings
  }
}

/** A card's specific iteration. */
export class CardPrinting extends ValueObject<CardPrintingProps> {
  get setName() { return this.props.setName }
  get setCode() { return this.props.setCode }
  get collectorNum() { return this.props.collectorNum }
  get url() { return this.props.url }
}

/** @see {@link CardPrinting} */
export type CardPrintingProps = Readonly<{
  setName: string
  setCode: string
  collectorNum: string
  url: string
}>

const orderedConditions = [
  'poor',
  'played',
  'near-mint',
] as const

export type CardCondition = typeof orderedConditions[number]

/** `CardCondition` lookup map for sorting. */
const conditionsRankMap = Object.fromEntries(orderedConditions.map((condition, index) =>
  [condition, index])) as Record<CardCondition, number>

export const CardCondition = {
  /** @returns `-1` if `lhs < rhs`, `1` if `lhs > rhs`, `0` if equal. */
  compare(lhs: CardCondition, rhs: CardCondition): 0 | 1 | -1 {
    return lhs === rhs ? 0 : conditionsRankMap[lhs] < conditionsRankMap[rhs] ? -1 : 1
  },
} as const

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
  get setCode() { return this.props.setCode }
  get collectorNum() { return this.props.collectorNum }
}

/** @see {@link CardPrinting} */
export type CardPrintingProps = Readonly<{
  setCode: string
  collectorNum: string
}>

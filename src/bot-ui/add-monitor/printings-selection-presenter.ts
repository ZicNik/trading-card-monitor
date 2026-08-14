import type { ExactSearchRequestedOutput, ExactSearchRequestedOutputPort } from '@/search'
import { ReplyKeyboardButton, type MessageOptions, type ReplyKeyboard } from '../bot-output'

export const printingsSubmissionPayload = 'printings-submit'

export type PrintingsSelectionViewModel = Readonly<{
  text: string
  options: MessageOptions
}>

export type PrintingsSelectionState = Readonly<{
  printings: ExactSearchRequestedOutput['printings']
  selection: readonly boolean[]
  submitted: boolean
}>

export class PrintingsSelectionPresenter implements ExactSearchRequestedOutputPort {
  state!: PrintingsSelectionState
  get vm(): PrintingsSelectionViewModel {
    const printings = [...this.state.printings]
    const selection = [...this.state.selection]
    return {
      text: text(printings, selection),
      options: { ...(this.state.submitted ? {} : { keyboard: keyboard(printings, selection) }) },
    }
  }

  present(output: ExactSearchRequestedOutput): void {
    this.state = {
      printings: output.printings,
      selection: Array(output.printings.length).fill(false),
      submitted: false,
    }
  }

  togglePrinting(index: number): void {
    const selection = [...this.state.selection]
    selection[index] = !selection[index]
    this.state = { ...this.state, selection }
  }

  submit(): void {
    this.state = { ...this.state, submitted: true }
  }
}

function text(printings: PrintingsSelectionState['printings'], selection: boolean[]): string {
  return 'Select from the following:\n'
    + printings.map((p, i) => `${selection[i] ? '✅' : '❌'} ${printingLabel(p)}`).join('\n')
}

function keyboard(printings: PrintingsSelectionState['printings'], selection: boolean[]): ReplyKeyboard {
  return [
    ...printings.map((p, i) => [ReplyKeyboardButton.create(printingLabel(p), i.toString())]),
    ...(selection.includes(true) ? [[ReplyKeyboardButton.create('SUBMIT', printingsSubmissionPayload)]] : []),
  ]
}

function printingLabel(p: PrintingsSelectionState['printings'][number]): string {
  return `${p.setCode} - ${p.collectorNum}`
}

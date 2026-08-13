import type { ExactSearchRequestedOutput, ExactSearchRequestedOutputPort } from '@/search'
import { ReplyKeyboardButton, type MessageOptions, type ReplyKeyboard } from '../bot-output'

export const printingsSubmissionPayload = 'printings-submit'

export type PrintingsSelectionViewModel = Readonly<{
  text: string
  options: MessageOptions
}>

type PrintingsSelectionState = Readonly<{
  printings: ExactSearchRequestedOutput['printings']
  selection: readonly boolean[]
  keyboardOn: boolean
}>

export class PrintingsSelectionPresenter implements ExactSearchRequestedOutputPort {
  state!: PrintingsSelectionState
  vm!: PrintingsSelectionViewModel

  present(output: ExactSearchRequestedOutput): void {
    this.state = {
      printings: output.printings,
      selection: Array(output.printings.length).fill(false),
      keyboardOn: true,
    }
    this.updateVM()
  }

  togglePrinting(index: number): void {
    const selection = [...this.state.selection]
    selection[index] = !selection[index]
    this.state = { ...this.state, selection }
    this.updateVM()
  }

  toggleKeyboard(on?: boolean): void {
    const keyboardOn = on === undefined ? !this.state.keyboardOn : on
    this.state = { ...this.state, keyboardOn }
    this.updateVM()
  }

  private updateVM(): void {
    const printings = [...this.state.printings]
    const selection = [...this.state.selection]
    this.vm = {
      text: text(printings, selection),
      options: { ...(this.state.keyboardOn ? { keyboard: keyboard(printings, selection) } : {}) },
    }
  }
}

function text(printings: PrintingsSelectionState['printings'], selection: boolean[]): string {
  return 'Select the printings you would like to monitor.\n'
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

import type { ExactSearchRequestedOutput, ExactSearchRequestedOutputPort } from '@/use-cases'

import { ReplyKeyboardButton, type ReplyKeyboard } from '../bot-output'
import type { MessageViewModel } from '../views'

export type SelectablePrinting = ExactSearchRequestedOutput['printings'][number] & { readonly selected: boolean }

export type PrintingsSelectionState = Readonly<{
  printings: readonly SelectablePrinting[]
  submitted: boolean
}>

type PrintingsSelectionViewModel = MessageViewModel

export class PrintingsSelectionPresenter implements ExactSearchRequestedOutputPort {
  state!: PrintingsSelectionState
  get vm(): PrintingsSelectionViewModel {
    const printings = this.state.printings
    return {
      text: text(printings),
      options: { ...(this.state.submitted ? {} : { keyboard: keyboard(printings) }) },
    }
  }

  present(output: ExactSearchRequestedOutput): void {
    this.state = {
      printings: output.printings.map(p => ({ ...p, selected: false })),
      submitted: false,
    }
  }

  togglePrinting(id: string): void {
    this.state = {
      ...this.state,
      printings: this.state.printings
        .map(p => printingId(p) === id ? { ...p, selected: !p.selected } : p),
    }
  }

  selectAll(): void {
    this.state = {
      ...this.state,
      printings: this.state.printings
        .map(p => ({ ...p, selected: true })),
    }
  }

  submit(): void {
    this.state = { ...this.state, submitted: true }
  }
}

export const printingsSelectAllPayload = 'printings-select-all'
export const printingsSubmissionPayload = 'printings-submit'

export function printingId(p: SelectablePrinting): string {
  return p.setCode + p.collectorNum
}

function printingLabel(p: SelectablePrinting): string {
  return `${p.setCode} - ${p.collectorNum}`
}

function text(printings: readonly SelectablePrinting[]): string {
  return 'Select from the following:\n'
    + printings.map(p => `${p.selected ? '✅' : '❌'} ${printingLabel(p)}`).join('\n')
}

function keyboard(printings: readonly SelectablePrinting[]): ReplyKeyboard {
  return [
    [ReplyKeyboardButton.create('ALL', printingsSelectAllPayload)],
    ...printings.map(p => [ReplyKeyboardButton.create(printingLabel(p), printingId(p))]),
    ...(printings.some(p => p.selected) ? [[ReplyKeyboardButton.create('SUBMIT', printingsSubmissionPayload)]] : []),
  ]
}

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
      options: {
        ...(this.state.submitted ? {} : { keyboard: keyboard(printings) }),
        formatting: 'html',
        linkPreview: false,
      },
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

function text(printings: readonly SelectablePrinting[]): string {
  return 'Select from the following:\n'
    + printings.map(printingText).join('\n')
}

function printingText(p: SelectablePrinting): string {
  return `${p.selected ? '✅' : '❌'} <a href="${p.url}">${p.setName} [${printingButtonLabel(p)}]</a>`
}

function printingButtonLabel(p: SelectablePrinting): string {
  return `${p.setCode} ${p.collectorNum}`
}

function keyboard(printings: readonly SelectablePrinting[]): ReplyKeyboard {
  const buttonRows = [[ReplyKeyboardButton.create('ALL', printingsSelectAllPayload)]]
  const printingButtonsPerRow = 3
  for (let i = 0; i < printings.length; i += printingButtonsPerRow)
    buttonRows.push(printings.slice(i, i + printingButtonsPerRow)
      .map(p => ReplyKeyboardButton.create(printingButtonLabel(p), printingId(p))))
  if (printings.some(p => p.selected))
    buttonRows.push([ReplyKeyboardButton.create('SUBMIT', printingsSubmissionPayload)])
  return buttonRows
}

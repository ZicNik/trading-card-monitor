import { ReplyKeyboard, ReplyKeyboardButton, type BotOutputPort } from '@/bot-ui/bot-output'
import { assign, fromPromise, not, setup } from 'xstate'
import { printingsSubmissionPayload } from '../printings-selection-presenter'

export const addCardTraderMonitorMachineId = 'addCardTraderMonitorMachine'

const askForFoilMessage = 'Do you want to monitor foil versions of this card?'
const foilYesPayload = 'foil-yes'
const foilNoPayload = 'foil-no'
const askForCtZeroMessage = 'Do you want to buy using CardTrader Zero?'
const ctZeroYesPayload = 'ct-zero-yes'
const ctZeroNoPayload = 'ct-zero-no'

export const addCardTraderMonitorMachine = setup({
  types: {
    input: {} as {
      chatId: string
    },
    context: {} as {
      chatId: string
      messageId?: string
      cardName?: string
      printings?: string[]
      printingsSelection: boolean[]
      maxPrice?: string
      foil?: boolean
      ctZero?: boolean
    },
    events: {} as
    | { type: 'message', text: string }
    | { type: 'buttonPress', payload: string },
  },
  guards: {
    isPrintingsSubmission: ({ event }) => event.type === 'buttonPress' && event.payload === printingsSubmissionPayload,
    isValidMaxPrice: ({ event }) => event.type === 'message' && /^(0|[1-9]\d*)([.,]\d{2})?$/.test(event.text),
  },
  actions: {
    assignPrintingsSelection: assign({ printingsSelection: ({ context, event }) => {
      if (event.type !== 'buttonPress')
        return context.printingsSelection
      const index = parseInt(event.payload)
      const newSelection = [...context.printingsSelection]
      newSelection[index] = !newSelection[index]
      return newSelection
    } }),
    assignFoil: assign({ foil: ({ event }) => {
      if (event.type !== 'buttonPress')
        return undefined
      switch (event.payload) {
        case foilYesPayload:
          return true
        case foilNoPayload:
          return false
        default:
          return undefined
      }
    } }),
    assignCtZero: assign({ ctZero: ({ event }) => {
      if (event.type !== 'buttonPress')
        return undefined
      switch (event.payload) {
        case ctZeroYesPayload:
          return true
        case ctZeroNoPayload:
          return false
        default:
          return undefined
      }
    } }),
  },
  actors: {
    askForCardName: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'Which card are you willing to monitor on CardTrader?')),
    askForPrintingsSelection: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string, printings: string[] } }) =>
      input.port.sendMessage(
        input.chatId,
        printingsSelectionMessage(input.printings),
        { keyboard: printingsSelectionKeyboard(input.printings) },
      )),
    updatePrintingsSelection: fromPromise(({ input }: {
      input: {
        port: BotOutputPort
        chatId: string
        messageId: string
        printings: string[]
        selection: boolean[]
      }
    }) =>
      input.port.editMessage(
        input.chatId,
        input.messageId,
        printingsSelectionMessage(input.printings, input.selection),
        { keyboard: printingsSelectionKeyboard(input.printings, input.selection) },
      )),
    submitPrintingsSelection: fromPromise(({ input }: {
      input: {
        port: BotOutputPort
        chatId: string
        messageId: string
        printings: string[]
        selection: boolean[]
      }
    }) => input.port.editMessage(input.chatId, input.messageId, printingsSelectionMessage(input.printings, input.selection))),
    askForMaxPrice: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'What is the maximum price, in euros, you are willing to pay for this card?')),
    showMaxPriceError: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'This is not a valid amount. Try again.')),
    askForFoil: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, askForFoilMessage, {
        keyboard: ReplyKeyboard.from([
          [['Yes', foilYesPayload], ['No', foilNoPayload]],
          ['Any'],
        ]),
      })),
    submitFoil: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string, messageId: string, foil: boolean | undefined } }) =>
      input.port.editMessage(input.chatId, input.messageId, `${askForFoilMessage} *${toYesOrNoOrAny(input.foil)}*`, { formatting: 'markdown' })),
    askForCtZero: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, askForCtZeroMessage, {
        keyboard: ReplyKeyboard.from([
          [['Yes', ctZeroYesPayload], ['No', ctZeroNoPayload]],
          ['Any'],
        ]),
      })),
    submitCtZero: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string, messageId: string, ctZero: boolean | undefined } }) =>
      input.port.editMessage(input.chatId, input.messageId, `${askForCtZeroMessage} *${toYesOrNoOrAny(input.ctZero)}*`, { formatting: 'markdown' })),
  },
}).createMachine({
  context: ({ input }) => ({
    chatId: input.chatId,
    printings: ['One', 'Two', 'Three', 'Four', 'Five'], // For testing purposes, until fetching is implemented
    printingsSelection: [false, false, false, false, false],
  }),
  initial: 'askingForCardName',
  states: {
    askingForCardName: {
      invoke: {
        src: 'askForCardName',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
        onDone: 'awaitingForCardName',
      },
    },
    awaitingForCardName: {
      on: {
        message: {
          actions: assign({ cardName: ({ event }) => event.text }),
          target: 'askingForPrintingsSelection',
        },
      },
    },
    fetchingPrintings: {},
    askingForPrintingsSelection: {
      invoke: {
        src: 'askForPrintingsSelection',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId, printings: context.printings! }),
        onDone: {
          target: 'awaitingForPrintingsSelection',
          actions: assign({ messageId: ({ event }) => event.output.id }),
        },
      },
    },
    awaitingForPrintingsSelection: {
      on: {
        buttonPress: [{
          guard: 'isPrintingsSubmission',
          target: 'submittingPrintingsSelection',
        }, {
          guard: not('isPrintingsSubmission'),
          actions: 'assignPrintingsSelection',
          target: 'updatingPrintingsSelection',
        }],
      },
    },
    updatingPrintingsSelection: {
      invoke: {
        src: 'updatePrintingsSelection',
        input: ({ context, self }) => ({
          port: self.system.env.outputPort,
          chatId: context.chatId,
          messageId: context.messageId!,
          printings: context.printings!,
          selection: context.printingsSelection,
        }),
        onDone: 'awaitingForPrintingsSelection',
      },
    },
    submittingPrintingsSelection: {
      invoke: {
        src: 'submitPrintingsSelection',
        input: ({ context, self }) => ({
          port: self.system.env.outputPort,
          chatId: context.chatId,
          messageId: context.messageId!,
          printings: context.printings!,
          selection: context.printingsSelection,
        }),
        onDone: 'askingForMaxPrice',
      },
    },
    askingForMaxPrice: {
      invoke: {
        src: 'askForMaxPrice',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
        onDone: 'awaitingForMaxPrice',
      },
    },
    awaitingForMaxPrice: {
      on: {
        message: [{
          guard: 'isValidMaxPrice',
          actions: assign({ maxPrice: ({ event }) => event.text }),
          target: 'askingForFoil',
        }, {
          guard: not('isValidMaxPrice'),
          target: 'showingMaxPriceError',
        }],
      },
    },
    showingMaxPriceError: {
      invoke: {
        src: 'showMaxPriceError',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
        onDone: 'awaitingForMaxPrice',
      },
    },
    askingForFoil: {
      invoke: {
        src: 'askForFoil',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
        onDone: {
          target: 'awaitingForFoil',
          actions: assign({ messageId: ({ event }) => event.output.id }),
        },
      },
    },
    awaitingForFoil: {
      on: {
        buttonPress: {
          actions: 'assignFoil',
          target: 'submittingFoil',
        },
      },
    },
    submittingFoil: {
      invoke: {
        src: 'submitFoil',
        input: ({ context, self }) => ({
          port: self.system.env.outputPort,
          chatId: context.chatId,
          messageId: context.messageId!,
          foil: context.foil,
        }),
        onDone: 'askingForCtZero',
      },
    },
    askingForCtZero: {
      invoke: {
        src: 'askForCtZero',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
        onDone: {
          target: 'awaitingForCtZero',
          actions: assign({ messageId: ({ event }) => event.output.id }),
        },
      },
    },
    awaitingForCtZero: {
      on: {
        buttonPress: {
          actions: 'assignCtZero',
          target: 'submittingCtZero',
        },
      },
    },
    submittingCtZero: {
      invoke: {
        src: 'submitCtZero',
        input: ({ context, self }) => ({
          port: self.system.env.outputPort,
          chatId: context.chatId,
          messageId: context.messageId!,
          ctZero: context.ctZero,
        }),
        onDone: 'done',
      },
    },
    done: { type: 'final' },
  },
})

function printingsSelectionMessage(printings: string[], selection: boolean[] = []): string {
  return 'Select the printings you would like to monitor.\n'
    + printings.map((printing, index) => `${selection[index] ? '✅' : '❌'} ${printing}`).join('\n')
}

function printingsSelectionKeyboard(printings: string[], selection: boolean[] = []): ReplyKeyboard {
  return [
    ...printings.map((printing, index) => [ReplyKeyboardButton.create(printing, index.toString())]),
    ...(selection.includes(true) ? [[ReplyKeyboardButton.create('SUBMIT', printingsSubmissionPayload)]] : []),
  ]
}

function toYesOrNoOrAny(b: boolean | undefined): string {
  switch (b) {
    case true:
      return 'Yes'
    case false:
      return 'No'
    case undefined:
      return 'Any'
  }
}

import { ReplyKeyboard, ReplyKeyboardButton, type BotOutputPort } from '@/bot-ui/bot-output'
import { assign, fromPromise, setup } from 'xstate'

export const addCardTraderMonitorMachineId = 'addCardTraderMonitorMachine'

const printingsSubmissionPayload = 'printings-submitted'

export const addCardTraderMonitorMachine = setup({
  types: {
    input: {} as {
      chatId: string
    },
    context: {} as {
      chatId: string
      cardName?: string
      printingsMessageId?: string
      printings?: string[]
      printingsSelection: boolean[]
    },
    events: {} as
    | { type: 'message', text: string }
    | { type: 'buttonPress', payload: string },
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
          actions: assign({ printingsMessageId: ({ event }) => event.output.id }),
        },
      },
    },
    awaitingForPrintingsSelection: {
      on: {
        buttonPress: [{
          guard: ({ event }) => event.payload !== printingsSubmissionPayload,
          actions: assign({
            printingsSelection: ({ context, event }) => {
              const index = parseInt(event.payload)
              const newSelection = [...context.printingsSelection]
              newSelection[index] = !newSelection[index]
              return newSelection
            },
          }),
          target: 'updatingPrintingsSelection',
        }, {
          guard: ({ event }) => event.payload === printingsSubmissionPayload,
          target: 'submittingPrintingsSelection',
        }],
      },
    },
    updatingPrintingsSelection: {
      invoke: {
        src: 'updatePrintingsSelection',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId, messageId: context.printingsMessageId!, printings: context.printings!, selection: context.printingsSelection }),
        onDone: 'awaitingForPrintingsSelection',
      },
    },
    submittingPrintingsSelection: {
      invoke: {
        src: 'submitPrintingsSelection',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId, messageId: context.printingsMessageId!, printings: context.printings!, selection: context.printingsSelection }),
        onDone: 'done',
      },
    },
    askingForMaxPrice: {},
    awaitingForMaxPrice: {},
    askingForFoil: {},
    awaitingForFoil: {},
    askingForCtZero: {},
    awaitingForCtZero: {},
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

import { ReplyKeyboard, type BotOutputPort } from '@/bot-ui/bot-output'
import { assign, fromPromise, setup } from 'xstate'

export const addCardTraderMonitorMachineId = 'addCardTraderMonitorMachine'

export const addCardTraderMonitorMachine = setup({
  types: {
    input: {} as {
      chatId: string
    },
    context: {} as {
      chatId: string
      cardName?: string
      printingsMessageId?: string
      printingsSelection: boolean[]
    },
    events: {} as
    | { type: 'message', text: string }
    | { type: 'buttonPress', payload: string },
  },
  actors: {
    askForCardName: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'Which card are you willing to monitor on CardTrader?')),
    askForPrintingsSelection: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(
        input.chatId,
        'Which printings would you like to monitor?',
        {
          keyboard: ReplyKeyboard.from([
            [['❌ First', '0']],
            [['❌ Second', '1']],
            [['❌ Third', '2']],
            [['❌ Fourth', '3']],
            [['Done', 'done']],
          ]),
        },
      )),
    updatePrintingsSelection: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string, messageId: string, selection: boolean[] } }) =>
      input.port.editMessage(
        input.chatId,
        input.messageId,
        'Which printings would you like to monitor?',
        {
          keyboard: ReplyKeyboard.from([
            [[`${input.selection[0] ? '✅' : '❌'} First`, '0']],
            [[`${input.selection[1] ? '✅' : '❌'} Second`, '1']],
            [[`${input.selection[2] ? '✅' : '❌'} Third`, '2']],
            [[`${input.selection[3] ? '✅' : '❌'} Fourth`, '3']],
            [['Done', 'done']],
          ]),
        },
      )),
  },
}).createMachine({
  context: ({ input }) => ({
    chatId: input.chatId,
    printingsSelection: [false, false, false, false],
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
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
        onDone: {
          target: 'awaitingForPrintingsSelection',
          actions: assign({ printingsMessageId: ({ event }) => event.output.id }),
        },
      },
    },
    awaitingForPrintingsSelection: {
      on: {
        buttonPress: [{
          guard: ({ event }) => event.payload !== 'done',
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
          guard: ({ event }) => event.payload === 'done',
          target: 'done',
        }],
      },
    },
    updatingPrintingsSelection: {
      invoke: {
        src: 'updatePrintingsSelection',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId, messageId: context.printingsMessageId!, selection: context.printingsSelection }),
        onDone: 'awaitingForPrintingsSelection',
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

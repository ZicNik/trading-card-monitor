import type { BotOutputPort } from '@/bot-ui/bot-output'
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
    },
    events: {} as
    | { type: 'message', text: string }
    | { type: 'buttonPress', payload: string },
  },
  actors: {
    askForCardName: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'Which card are you willing to monitor on CardTrader?')),
  },
}).createMachine({
  context: ({ input }) => ({
    chatId: input.chatId,
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
          target: 'done',
        },
      },
    },
    fetchingPrintings: {},
    askingForPrintingsSelection: {},
    awaitingForPrintingsSelection: {},
    updatingPrintingsSelection: {},
    askingForMaxPrice: {},
    awaitingForMaxPrice: {},
    askingForFoil: {},
    awaitingForFoil: {},
    askingForCtZero: {},
    awaitingForCtZero: {},
    done: { type: 'final' },
  },
})

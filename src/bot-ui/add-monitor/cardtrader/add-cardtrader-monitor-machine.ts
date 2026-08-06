import type { BotOutputPort } from '@/bot-ui/bot-output'
import { fromPromise, setup } from 'xstate'

export const addCardTraderMonitorMachineId = 'addCardTraderMonitorMachine'

export const addCardTraderMonitorMachine = setup({
  types: {
    input: {} as {
      chatId: string
    },
    context: {} as {
      chatId: string
    },
    events: {} as { type: 'message', text: string },
  },
  actors: {
    askForCard: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'Which card are you willing to monitor on CardTrader?')),
  },
}).createMachine({
  context: ({ input }) => ({
    chatId: input.chatId,
  }),
  initial: 'askingForCard',
  states: {
    askingForCard: {
      invoke: {
        src: 'askForCard',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
        onDone: 'done',
      },
    },
    done: { type: 'final' },
  },
})

import { Message } from '@/bot-ui/views'
import { setup } from 'xstate'

export const listMonitorsMachineId = 'listMonitorsMachine'

export const listMonitorsMachine = setup({
  types: {
    input: {} as {
      chatId: string
    },
    context: {} as {
      chatId: string
    },
  },
  actors: {
    showUnderDevelopment: Message.withText('/list is under development.').toActor(),
  },
}).createMachine({
  context: ({ input }) => ({
    chatId: input.chatId,
  }),
  initial: 'showingUnderDevelopment',
  states: {
    showingUnderDevelopment: {
      invoke: {
        src: 'showUnderDevelopment',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: { target: 'done' },
      },
    },
    done: { type: 'final' },
  },
})

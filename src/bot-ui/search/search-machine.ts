import { assign, fromPromise, setup } from 'xstate'
import type { BotOutputPort } from '../bot-output'

type SearchResult = string

const search = fromPromise(
  async ({ input }: { input: { query: string } }): Promise<SearchResult> => {
    await new Promise(resolve => setTimeout(resolve, 5_000))
    return 'Search result for query: ' + input.query
  },
)

export const searchMachineId = 'searchMachine'

export const searchMachine = setup({
  types: {
    input: {} as {
      outputPort: BotOutputPort
      chatId: string
    },
    context: {} as {
      outputPort: BotOutputPort
      chatId: string
      query?: string
    },
    events: {} as { type: 'message', text: string },
  },
  actors: {
    search,
  },
  actions: {
    askForQuery: ({ context }) => {
      void context.outputPort.sendMessage(context.chatId, 'What are you looking for?')
    },
    showResult: ({ context }, params: SearchResult) => {
      void context.outputPort.sendMessage(context.chatId, params)
    },
  },
}).createMachine({
  context: ({ input }) => ({ outputPort: input.outputPort, chatId: input.chatId }),
  initial: 'awaitingQuery',
  states: {
    awaitingQuery: {
      entry: 'askForQuery',
      on: {
        message: {
          actions: assign({ query: ({ event }) => event.text }),
          target: 'searching',
        },
      },
    },
    searching: {
      invoke: {
        src: 'search',
        input: ({ context }) => ({ query: context.query! }),
        onDone: {
          actions: {
            type: 'showResult',
            params: ({ event }) => event.output,
          },
          target: 'done',
        },
      },
    },
    done: { type: 'final' },
  },
})

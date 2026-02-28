import { assign, fromPromise, setup } from 'xstate'

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
      chatId: string
    },
    context: {} as {
      chatId: string
      query?: string
    },
    events: {} as { type: 'message', text: string },
  },
  actors: {
    search,
  },
  actions: {
    showResult: (_, params: SearchResult) => {
      console.log(params)
    },
  },
}).createMachine({
  context: ({ input }) => ({ chatId: input.chatId }),
  initial: 'awaitingQuery',
  states: {
    awaitingQuery: {
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

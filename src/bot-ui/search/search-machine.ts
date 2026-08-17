import { assign, fromPromise, setup, type ActorSystem, type ActorSystemInfo } from 'xstate'
import { Message } from '../views'

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
    askForQuery: Message.withText('Which card are you looking for?').toActor(),
    search: fromPromise(({ input, system }: { input: { query: string }, system: ActorSystem<ActorSystemInfo> }) =>
      system.env.fuzzySearchRequestedUseCase.execute(input.query)),
    showResult: Message.withViewModel(({ env }) => env.fuzzySearchPresenter.vm).toActor(),
    showError: Message.withText('No card found with this name. Try again.').toActor(),
  },
}).createMachine({
  context: ({ input }) => ({ chatId: input.chatId }),
  initial: 'askingForQuery',
  states: {
    askingForQuery: {
      invoke: {
        src: 'askForQuery',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: 'awaitingQuery',
      },
    },
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
        onDone: 'showingResult',
        onError: 'showingError',
      },
    },
    showingResult: {
      invoke: {
        src: 'showResult',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: 'done',
      },
    },
    showingError: {
      invoke: {
        src: 'showError',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: 'awaitingQuery',
      },
    },
    done: { type: 'final' },
  },
})

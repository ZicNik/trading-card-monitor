/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Message } from '@/bot-ui/views'
import { assign, fromPromise, setup, type ActorSystem, type ActorSystemInfo } from 'xstate'

export const searchMachineId = 'searchMachine'

const askForQueryText = 'Which card are you looking for?\nDon\'t worry about exact spelling or typing the whole name. I\'ll find the closest match.'
const showErrorText = 'I couldn\'t find a match for that, but you can try again. Type just a part of the name you are sure about.'

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
    askForQuery: Message.withText(askForQueryText).toActor(),
    search: fromPromise(({ input, system }: { input: { query: string }, system: ActorSystem<ActorSystemInfo> }) =>
      system.env.fuzzySearchRequestedUseCase.execute(input.query)),
    showResult: Message.withViewModel(({ env }) => env.fuzzySearchPresenter.vm).toActor(),
    showError: Message.withText(showErrorText).toActor(),
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

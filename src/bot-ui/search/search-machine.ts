import type { SearchRequestedUseCase } from '@/search'
import { assign, fromPromise, setup } from 'xstate'
import type { BotOutputPort } from '../bot-output'
import type { SearchRequestedPresenter } from './search-requested-presenter'

export const searchMachineId = 'searchMachine'

export const searchMachine = setup({
  types: {
    input: {} as {
      outputPort: BotOutputPort
      searchRequestedUseCase: SearchRequestedUseCase
      searchRequestedPresenter: SearchRequestedPresenter
      chatId: string
    },
    context: {} as {
      outputPort: BotOutputPort
      searchRequestedUseCase: SearchRequestedUseCase
      searchRequestedPresenter: SearchRequestedPresenter
      chatId: string
      query?: string
    },
    events: {} as { type: 'message', text: string },
  },
  actors: {
    askForQuery: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'Which card are you looking for?')),
    search: fromPromise(({ input }: { input: { useCase: SearchRequestedUseCase, query: string } }) =>
      input.useCase.execute(input.query)),
    showResult: fromPromise(({ input }: { input: { port: BotOutputPort, presenter: SearchRequestedPresenter, chatId: string } }) =>
      input.port.sendMessage(input.chatId, input.presenter.vm!.text)),
    showError: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'No card found with this name. Try again.')),
  },
}).createMachine({
  context: ({ input }) => ({
    outputPort: input.outputPort,
    searchRequestedUseCase: input.searchRequestedUseCase,
    searchRequestedPresenter: input.searchRequestedPresenter,
    chatId: input.chatId,
  }),
  initial: 'askingForQuery',
  states: {
    askingForQuery: {
      invoke: {
        src: 'askForQuery',
        input: ({ context }) => ({ port: context.outputPort, chatId: context.chatId }),
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
        input: ({ context }) => ({ useCase: context.searchRequestedUseCase, query: context.query! }),
        onDone: 'showingResult',
        onError: 'showingError',
      },
    },
    showingResult: {
      invoke: {
        src: 'showResult',
        input: ({ context }) => ({ port: context.outputPort, presenter: context.searchRequestedPresenter, chatId: context.chatId }),
        onDone: 'done',
      },
    },
    showingError: {
      invoke: {
        src: 'showError',
        input: ({ context }) => ({ port: context.outputPort, chatId: context.chatId }),
        onDone: 'awaitingQuery',
      },
    },
    done: { type: 'final' },
  },
})

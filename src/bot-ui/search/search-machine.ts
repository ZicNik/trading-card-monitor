import type { SearchRequestedUseCase } from '@/search'
import { assign, fromPromise, setup } from 'xstate'
import type { BotOutputPort } from '../bot-output'
import type { SearchRequestedPresenter } from './search-requested-presenter'

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
    askForQuery: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'Which card are you looking for?')),
    search: fromPromise(({ input }: { input: { useCase: SearchRequestedUseCase, query: string } }) =>
      input.useCase.execute(input.query)),
    showResult: fromPromise(({ input }: { input: { port: BotOutputPort, presenter: SearchRequestedPresenter, chatId: string } }) =>
      input.port.sendMessage(input.chatId, input.presenter.vm!.text, input.presenter.vm!.options)),
    showError: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'No card found with this name. Try again.')),
  },
}).createMachine({
  context: ({ input }) => ({
    chatId: input.chatId,
  }),
  initial: 'askingForQuery',
  states: {
    askingForQuery: {
      invoke: {
        src: 'askForQuery',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
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
        input: ({ context, self }) => ({ useCase: self.system.env.searchRequestedUseCase, query: context.query! }),
        onDone: 'showingResult',
        onError: 'showingError',
      },
    },
    showingResult: {
      invoke: {
        src: 'showResult',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, presenter: self.system.env.searchRequestedPresenter, chatId: context.chatId }),
        onDone: 'done',
      },
    },
    showingError: {
      invoke: {
        src: 'showError',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
        onDone: 'awaitingQuery',
      },
    },
    done: { type: 'final' },
  },
})

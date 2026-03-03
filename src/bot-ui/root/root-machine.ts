import type { SearchRequestedUseCase } from '@/search'
import { assign, forwardTo, setup, type AnyActorRef } from 'xstate'
import type { BotOutputPort } from '../bot-output'
import { searchMachine, searchMachineId } from '../search/search-machine'
import type { SearchRequestedPresenter } from '../search/search-requested-presenter'

export type RootMachineEvent
  = | { type: 'command', command: string }
    | { type: 'message', text: string }

export const rootMachine = setup({
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
      activeChild?: string
    },
    events: {} as RootMachineEvent,
  },
  guards: {
    isSearchCommand: ({ event }) => event.type === 'command' && event.command === 'search',
    hasActiveChild: ({ context }) => context.activeChild !== undefined,
  },
  actions: {
    forwardToActiveChild: forwardTo(({ context, system }) => {
      const id = context.activeChild
      if (id === undefined)
        throw new Error('No active child to forward to')
      const actor = system.get(id) as AnyActorRef | undefined
      if (actor === undefined)
        throw new Error(`No active child to forward to for id '${id}'`)
      return actor
    }),
  },
  actors: {
    searchMachine,
  },
}).createMachine({
  context: ({ input }) => ({
    outputPort: input.outputPort,
    searchRequestedUseCase: input.searchRequestedUseCase,
    searchRequestedPresenter: input.searchRequestedPresenter,
    chatId: input.chatId,
  }),
  initial: 'idle',
  states: {
    idle: {
      entry: assign({ activeChild: () => undefined }),
    },
    search: {
      entry: assign({ activeChild: () => searchMachineId }),
      invoke: {
        systemId: searchMachineId,
        src: 'searchMachine',
        input: ({ context }) => ({
          outputPort: context.outputPort,
          searchRequestedUseCase: context.searchRequestedUseCase,
          searchRequestedPresenter: context.searchRequestedPresenter,
          chatId: context.chatId,
        }),
        onDone: { target: 'idle' },
      },
    },
  },
  on: {
    command: {
      guard: 'isSearchCommand',
      target: '.search',
    },
    message: {
      guard: 'hasActiveChild',
      actions: 'forwardToActiveChild',
    },
  },
})

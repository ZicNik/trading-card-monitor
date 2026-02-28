import { assign, forwardTo, setup, type AnyActorRef } from 'xstate'
import { searchMachine, searchMachineId } from '../search/search-machine'

export const rootMachine = setup({
  types: {
    input: {} as { chatId: string },
    context: {} as {
      chatId: string
      activeChild?: string
    },
    events: {} as
    | { type: 'command', command: string }
    | { type: 'message', text: string },
  },
  guards: {
    isSearchCommand: ({ event }) => event.type === 'command' && event.command === 'search',
    hasActiveChild: ({ context }) => context.activeChild !== undefined,
  },
  actions: {
    forwardToActiveChild: forwardTo(({ context, system }) => {
      const activeChild = context.activeChild
      if (activeChild === undefined)
        throw new Error('No active child to forward to')
      return system.get(activeChild) as AnyActorRef
    }),
  },
  actors: {
    searchMachine,
  },
}).createMachine({
  context: ({ input }) => ({
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
        input: ({ context }) => ({ chatId: context.chatId }),
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

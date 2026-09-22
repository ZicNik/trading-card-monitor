import type { CreateRootMachineInput, RootMachineEvent } from '@/bot-ui'
import { Message } from '@/bot-ui/views'
import { assign, forwardTo, setup, type AnyActorRef } from 'xstate'
import { addMonitorMachine, addMonitorMachineId } from '../add-monitor/add-monitor-machine'
import { searchMachine, searchMachineId } from '../search/search-machine'

export const rootMachine = setup({
  types: {
    input: {} as CreateRootMachineInput,
    context: {} as {
      chatId: string
      activeChild?: string
    },
    events: {} as RootMachineEvent,
  },
  guards: {
    isSearchCommand: ({ event }) => event.type === 'command' && event.command === 'search',
    isAddMonitorCommand: ({ event }) => event.type === 'command' && event.command === 'monitor',
    isListCommand: ({ event }) => event.type === 'command' && event.command === 'list',
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
    addMonitorMachine,
    listActor: Message.withText('\'list\' command is under development yet.').toActor(),
  },
}).createMachine({
  context: ({ input }) => ({ chatId: input.chatId }),
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
    addMonitor: {
      entry: assign({ activeChild: () => addMonitorMachineId }),
      invoke: {
        systemId: addMonitorMachineId,
        src: 'addMonitorMachine',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: { target: 'idle' },
      },
    },
    listActiveMonitors: {
      invoke: {
        src: 'listActor',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: { target: 'idle' },
      },
    },
  },
  on: {
    command: [{
      guard: 'isSearchCommand',
      target: '.search',
    }, {
      guard: 'isAddMonitorCommand',
      target: '.addMonitor',
    }, {
      guard: 'isListCommand',
      target: '.listActiveMonitors',
    }],
    message: {
      guard: 'hasActiveChild',
      actions: 'forwardToActiveChild',
    },
    buttonPress: {
      guard: 'hasActiveChild',
      actions: 'forwardToActiveChild',
    },
  },
})

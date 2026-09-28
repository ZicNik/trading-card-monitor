import type { CreateRootMachineInput, RootMachineEvent } from '@/bot-ui'
import { Message } from '@/bot-ui/views'
import { assign, forwardTo, setup, type AnyActorRef } from 'xstate'
import { addMonitorMachine, addMonitorMachineId } from '../add-monitor/add-monitor-machine'
import { listMonitorsMachine, listMonitorsMachineId } from '../list-monitors/list-monitors-machine'
import { searchMachine, searchMachineId } from '../search/search-machine'

const startMessage = `<b>HOW IT WORKS</b>
1. <b>Search</b> — Pick your card name and printings.
2. <b>Filter</b> — Set your preferences.
3. <b>Relax</b> — I'll scan the market and ping you the moment it drops.

<b>GET STARTED</b>
• Tap /track to create your first alert.
• Tap /alerts to manage your active tracking list.
• Tap /card to look up exact spelling & details.

<b>Tip:</b> You can also type commands manually, or select them from the dedicated menu.`

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
    isStartCommand: ({ event }) => event.type === 'command' && event.command === 'start',
    isAddMonitorCommand: ({ event }) => event.type === 'command' && event.command === 'monitor',
    isListCommand: ({ event }) => event.type === 'command' && event.command === 'list',
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
    showStartMessage: Message.withText(startMessage, { formatting: 'html' }).toActor(),
    searchMachine,
    addMonitorMachine,
    listMonitorsMachine,
  },
}).createMachine({
  context: ({ input }) => ({ chatId: input.chatId }),
  initial: 'idle',
  states: {
    idle: {
      entry: assign({ activeChild: () => undefined }),
    },
    start: {
      invoke: {
        src: 'showStartMessage',
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
    listMonitors: {
      invoke: {
        systemId: listMonitorsMachineId,
        src: 'listMonitorsMachine',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: { target: 'idle' },
      },
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
    command: [{
      guard: 'isStartCommand',
      target: '.start',
    }, {
      guard: 'isSearchCommand',
      target: '.search',
    }, {
      guard: 'isAddMonitorCommand',
      target: '.addMonitor',
    }, {
      guard: 'isListCommand',
      target: '.listMonitors',
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

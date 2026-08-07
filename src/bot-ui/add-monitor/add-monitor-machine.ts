import { assign, forwardTo, setup, type AnyActorRef } from 'xstate'
import { addCardTraderMonitorMachine, addCardTraderMonitorMachineId } from './cardtrader/add-cardtrader-monitor-machine'

export const addMonitorMachineId = 'addMonitorMachine'

export const addMonitorMachine = setup({
  types: {
    input: {} as {
      chatId: string
    },
    context: {} as {
      chatId: string
      activeChild?: string
    },
    events: {} as
    | { type: 'message', text: string }
    | { type: 'buttonPress', payload: string },
  },
  guards: {
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
    addCardTraderMonitorMachine,
  },
}).createMachine({
  context: ({ input }) => ({
    chatId: input.chatId,
  }),
  initial: 'cardtrader',
  states: {
    // askingForMarket: {}, For now there is only one market
    cardtrader: {
      entry: assign({ activeChild: () => addCardTraderMonitorMachineId }),
      invoke: {
        systemId: addCardTraderMonitorMachineId,
        src: 'addCardTraderMonitorMachine',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: { target: 'done' },
      },
    },
    done: { type: 'final' },
  },
  on: {
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

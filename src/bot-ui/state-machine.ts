import { assign, setup } from 'xstate'

const machineSetup = setup({
  types: {
    input: {} as { userId: string },
    context: {} as { userId: string },
    events: {} as { type: 'idle' } | { type: 'search' },
    // events: {} as { type: 'command', command: string } | { type: 'message', text: string },
  },
  // guards: {
  //   isSearchCommand: (_, params: string) => params === 'search',
  // },
})

const states = machineSetup.createStateConfig({
  states: {
    idle: {},
    search: {},
  },
}).states

export const rootMachine = machineSetup.createMachine({
  context: ({ input }) => ({
    userId: input.userId,
  }),
  states,
  on: {
    idle: {
      target: 'idle',
      actions: assign({ }),
    },
    search: 'search',
    // command: [
    //   {
    //     guard: {
    //       type: 'isSearchCommand',
    //       params: ({ event }) => event.command,
    //     },
    //     target: 'search',
    //   },
    // ],
  },
})

// const actor = createActor(rootMachine, { input: { userId: 'user-123' } })
// actor.start()

// const value = actor.getSnapshot().value
// const context = actor.getSnapshot().context

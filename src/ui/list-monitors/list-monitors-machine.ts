import { CombinedView, Message, type MessageActorInput, type MessageActorOutput } from '@/bot-ui/views'
import { fromPromise, setup, type ActorSystem, type ActorSystemInfo } from 'xstate'

export const listMonitorsMachineId = 'listMonitorsMachine'

export const listMonitorsMachine = setup({
  types: {
    input: {} as {
      chatId: string
    },
    context: {} as {
      chatId: string
    },
  },
  actors: {
    fetchMonitors: fromPromise(({ input, system }: { input: { userId: string }, system: ActorSystem<ActorSystemInfo> }) =>
      system.env.getActiveMonitorsUseCase.execute({ userId: input.userId })),
    showMonitors: CombinedView.fromBuilder<MessageActorOutput, MessageActorInput>(({ env }) =>
      env.listMonitorsPresenter.vm.map(vm => Message.withViewModel(() => vm))).toActor(),
    showError: Message.withText('Something went wrong. You can try again later.').toActor(),
  },
}).createMachine({
  context: ({ input }) => ({
    chatId: input.chatId,
  }),
  initial: 'fetchingMonitors',
  states: {
    fetchingMonitors: {
      invoke: {
        src: 'fetchMonitors',
        input: ({ context }) => ({ userId: context.chatId }),
        onDone: { target: 'showingMonitors' },
        onError: { target: 'showiwingError' },
      },
    },
    showingMonitors: {
      invoke: {
        src: 'showMonitors',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: { target: 'done' },
        onError: { target: 'showingError' },
      },
    },
    showingError: {
      invoke: {
        src: 'showError',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: { target: 'done' },
      },
    },
    done: { type: 'final' },
  },
})

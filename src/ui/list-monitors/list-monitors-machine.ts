import { ReplyKeyboard } from '@/bot-ui/output'
import { CombinedView, Message, type MessageActorInput, type MessageActorOutput } from '@/bot-ui/views'
import { assign, fromPromise, setup, type ActorSystem, type ActorSystemInfo } from 'xstate'
import { deletePayloadPrefix } from './list-monitors-presenter'

export const listMonitorsMachineId = 'listMonitorsMachine'

const deleteYesPayload = 'delete-yes'
const deleteNoPayload = 'delete-no'

export const listMonitorsMachine = setup({
  types: {
    input: {} as {
      chatId: string
    },
    context: {} as {
      chatId: string
      deleteId?: number
    },
    events: {} as
    | { type: 'buttonPress', payload: string },
  },
  guards: {
    isDelete: ({ event }) => event.payload.startsWith(deletePayloadPrefix),
    isConfirmDelete: ({ event }) => event.payload === deleteYesPayload,
    isCancelDelete: ({ event }) => event.payload === deleteNoPayload,

  },
  actions: {
    assignDeleteId: assign({ deleteId: ({ event }) => parseInt(event.payload.slice(deletePayloadPrefix.length)) }),
  },
  actors: {
    fetchMonitors: fromPromise(({ input, system }: { input: { userId: string }, system: ActorSystem<ActorSystemInfo> }) =>
      system.env.getActiveMonitorsUseCase.execute({ userId: input.userId })),
    showMonitors: CombinedView.fromBuilder<MessageActorOutput, MessageActorInput>(({ env }) =>
      env.listMonitorsPresenter.vm.map(vm => Message.withViewModel(() => vm))).toActor(),
    askDeleteConfirmation: Message.withText('Are you sure you want to delete this alert?', {
      keyboard: ReplyKeyboard.from([
        [['Confirm', deleteYesPayload], ['Cancel', deleteNoPayload]],
      ]),
    }).toActor(),
    showGenericError: Message.withText('Something went wrong. You can try again later.').toActor(),
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
        onError: { target: 'showingFetchingError' },
      },
    },
    showingMonitors: {
      invoke: {
        src: 'showMonitors',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: { target: 'awaitingUserAction' },
        onError: { target: 'showingFetchingError' },
      },
    },
    showingFetchingError: {
      invoke: {
        src: 'showGenericError',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: { target: 'done' },
      },
    },
    awaitingUserAction: {
      on: {
        buttonPress: {
          guard: 'isDelete',
          actions: 'assignDeleteId',
          target: 'askingDeleteConfirmation',
        },
      },
    },
    askingDeleteConfirmation: {
      invoke: {
        src: 'askDeleteConfirmation',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: { target: 'awaitingDeleteConfirmation' },
      },
    },
    awaitingDeleteConfirmation: {
      on: {
        buttonPress: [{
          guard: 'isConfirmDelete',
          target: 'deletingMonitor',
        }, {
          guard: 'isCancelDelete',
          target: 'cancelingDelete',
        }],
      },
    },
    deletingMonitor: {},
    cancelingDelete: {},
    done: { type: 'final' },
  },
})

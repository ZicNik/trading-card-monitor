/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ReplyKeyboard } from '@/bot-ui/output'
import { CombinedView, EditedMessage, Message, type MessageActorInput, type MessageActorOutput } from '@/bot-ui/views'
import { assign, fromPromise, setup, type ActorSystem, type ActorSystemInfo } from 'xstate'
import { deletePayloadPrefix } from './list-monitors-presenter'

export const listMonitorsMachineId = 'listMonitorsMachine'

type MonitorInfo = Readonly<{
  messageId: string
  cardName: string
}>

const deleteYesPayload = 'delete-yes'
const deleteNoPayload = 'delete-no'

export const listMonitorsMachine = setup({
  types: {
    input: {} as {
      chatId: string
    },
    context: {} as {
      chatId: string
      monitorInfoById: Record<number, MonitorInfo>
      deleteId?: number
      messageId?: string
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
    initMonitorInfo: assign({ monitorInfoById: ({ system }, params: { messageIds: string[] }) => {
      const monitors = system.env.listMonitorsPresenter.state
      if (monitors.length !== params.messageIds.length)
        throw new Error('Counts of fetched and listed monitors don\'t match.')
      const info: Record<number, MonitorInfo> = {}
      for (let i = 0; i < monitors.length; i++) {
        const monitor = monitors[i]!
        info[monitor.id] = {
          messageId: params.messageIds[i]!,
          cardName: monitor.cardName,
        }
      }
      return info
    } }),
  },
  actors: {
    fetchMonitors: fromPromise(({ input, system }: { input: { userId: string }, system: ActorSystem<ActorSystemInfo> }) =>
      system.env.getActiveMonitorsUseCase.execute({ userId: input.userId })),
    showMonitors: CombinedView.fromBuilder<MessageActorOutput, MessageActorInput>(({ env }) =>
      env.listMonitorsPresenter.vm.map(vm => Message.withViewModel(() => vm))).toActor(),
    askDeleteConfirmation: Message.withDynamicText((input: { cardName: string }) => `Are you sure you want to delete this alert for <em>${input.cardName}</em>?`, {
      keyboard: ReplyKeyboard.from([
        [['Confirm', deleteYesPayload], ['Cancel', deleteNoPayload]],
      ]),
      formatting: 'html',
    }).toActor(),
    showDeleteCancellation: EditedMessage.withDynamicText(
      (input: { cardName: string }) => `The alert for <em>${input.cardName}</em> remains active.`,
      { formatting: 'html' },
    ).toActor(),
    showGenericError: Message.withText('Something went wrong. You can try again later.').toActor(),
  },
}).createMachine({
  context: ({ input }) => ({
    chatId: input.chatId,
    monitorInfoById: {},
  }),
  initial: 'fetchingMonitors',
  states: {
    fetchingMonitors: {
      invoke: {
        src: 'fetchMonitors',
        input: ({ context }) => ({ userId: context.chatId }),
        onDone: 'showingMonitors',
        onError: 'showingFetchingError',
      },
    },
    showingMonitors: {
      invoke: {
        src: 'showMonitors',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: {
          actions: {
            type: 'initMonitorInfo',
            params: ({ event }) => ({ messageIds: event.output.map(msg => msg.id) }),
          },
          target: 'awaitingUserAction',
        },
        onError: 'showingFetchingError',
      },
    },
    showingFetchingError: {
      invoke: {
        src: 'showGenericError',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: 'done',
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
        input: ({ context }) => ({
          chatId: context.chatId,
          cardName: context.monitorInfoById[context.deleteId!]!.cardName,
        }),
        onDone: {
          actions: assign({ messageId: ({ event }) => event.output.id }),
          target: 'awaitingDeleteConfirmation',
        },
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
    cancelingDelete: {
      invoke: {
        src: 'showDeleteCancellation',
        input: ({ context }) => ({
          chatId: context.chatId,
          messageId: context.messageId!,
          cardName: context.monitorInfoById[context.deleteId!]!.cardName,
        }),
        onDone: {
          actions: assign({
            deleteId: () => undefined,
            messageId: () => undefined,
          }),
          target: 'awaitingUserAction',
        },
      },
    },
    deletingMonitor: {},
    done: { type: 'final' },
  },
})

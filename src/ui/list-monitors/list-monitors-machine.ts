/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ReplyKeyboard } from '@/bot-ui/output'
import { CombinedView, EditedMessage, Message, type MessageActorInput, type MessageActorOutput } from '@/bot-ui/views'
import { CardMonitorNotFoundError } from '@/use-cases'
import { and, assign, fromPromise, not, setup, type ActorSystem, type ActorSystemInfo } from 'xstate'
import { deletePayloadPrefix } from './list-monitors-presenter'

export const listMonitorsMachineId = 'listMonitorsMachine'

type MonitorInfo = Readonly<{
  cardName: string
}>

const deleteYesPayload = 'delete-yes'
const deleteNoPayload = 'delete-no'

const genericErrorText = 'Something went wrong. Please try again later.'
const monitorToDeleteNotFoundText = 'Looks like the alert was already removed.'

function idFromDeletePayload(payload: string): number {
  return parseInt(payload.slice(deletePayloadPrefix.length))
}

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
    | { type: 'message', text: string }
    | { type: 'buttonPress', payload: string },
  },
  guards: {
    noActiveMonitors: ({ context }) => Object.keys(context.monitorInfoById).length === 0,
    isDelete: ({ event }) => event.type === 'buttonPress' && event.payload.startsWith(deletePayloadPrefix),
    canDelete: ({ event, context }) => event.type === 'buttonPress' && idFromDeletePayload(event.payload) in context.monitorInfoById,
    isConfirmDelete: (_, params: { payload: string }) => params.payload === deleteYesPayload,
    isCancelDelete: (_, params: { payload: string }) => params.payload === deleteNoPayload,
  },
  actions: {
    assignDeleteId: assign({ deleteId: (_, params: { payload: string }) => idFromDeletePayload(params.payload) }),
    initMonitorInfo: assign({ monitorInfoById: ({ system }) => {
      const info: Record<number, MonitorInfo> = {}
      for (const monitor of system.env.listMonitorsPresenter.state) {
        info[monitor.id] = { cardName: monitor.cardName }
      }
      return info
    } }),
    removeDeletedMonitorInfo: assign({ monitorInfoById: ({ context }) => {
      if (context.deleteId === undefined)
        return context.monitorInfoById
      const { [context.deleteId]: _, ...newInfo } = context.monitorInfoById
      return newInfo
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
    deleteMonitor: fromPromise(({ input, system }: { input: { monitorId: number }, system: ActorSystem<ActorSystemInfo> }) =>
      system.env.deleteMonitorUseCase.execute({ id: input.monitorId })),
    showDeleteSuccess: EditedMessage.withViewModel(({ env }) => env.deleteMonitorPresenter.vm).toActor(),
    showMonitorToDeleteNotFound: Message.withText(monitorToDeleteNotFoundText).toActor(),
    editWithMonitorToDeleteNotFound: EditedMessage.withText(monitorToDeleteNotFoundText).toActor(),
    showGenericError: Message.withText(genericErrorText).toActor(),
    editWithGenericError: EditedMessage.withText(genericErrorText).toActor(),
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
          actions: 'initMonitorInfo',
          target: 'routingAfterShowingMonitors',
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
    routingAfterShowingMonitors: {
      always: [
        { guard: 'noActiveMonitors', target: 'done' },
        'awaitingUserAction',
      ],
    },
    awaitingUserAction: {
      entry: assign({ deleteId: () => undefined, messageId: () => undefined }),
      on: {
        buttonPress: [
          {
            guard: and(['isDelete', 'canDelete']),
            actions: { type: 'assignDeleteId', params: ({ event }) => ({ payload: event.payload }) },
            target: 'askingDeleteConfirmation',
          },
          {
            guard: and(['isDelete', not('canDelete')]),
            target: 'showingMonitorToDeleteNotFound',
          },
        ],
      },
    },
    showingMonitorToDeleteNotFound: {
      invoke: {
        src: 'showMonitorToDeleteNotFound',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: 'awaitingUserAction',
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
          guard: { type: 'isConfirmDelete', params: ({ event }) => ({ payload: event.payload }) },
          target: 'deletingMonitor',
        }, {
          guard: { type: 'isCancelDelete', params: ({ event }) => ({ payload: event.payload }) },
          target: 'showingDeleteCancellation',
        }],
      },
    },
    showingDeleteCancellation: {
      invoke: {
        src: 'showDeleteCancellation',
        input: ({ context }) => ({
          chatId: context.chatId,
          messageId: context.messageId!,
          cardName: context.monitorInfoById[context.deleteId!]!.cardName,
        }),
        onDone: 'awaitingUserAction',
      },
    },
    deletingMonitor: {
      invoke: {
        src: 'deleteMonitor',
        input: ({ context }) => ({ monitorId: context.deleteId! }),
        onDone: {
          actions: 'removeDeletedMonitorInfo',
          target: 'showingDeleteSuccess',
        },
        onError: [
          {
            guard: ({ event }) => event.error instanceof CardMonitorNotFoundError,
            actions: 'removeDeletedMonitorInfo',
            target: 'editingWithMonitorToDeleteNotFound',
          },
          'showingGenericDeleteError',
        ],
      },
    },
    showingDeleteSuccess: {
      invoke: {
        src: 'showDeleteSuccess',
        input: ({ context }) => ({ chatId: context.chatId, messageId: context.messageId! }),
        onDone: 'awaitingUserAction',
      },
    },
    editingWithMonitorToDeleteNotFound: {
      invoke: {
        src: 'editWithMonitorToDeleteNotFound',
        input: ({ context }) => ({ chatId: context.chatId, messageId: context.messageId! }),
        onDone: 'awaitingUserAction',
      },
    },
    showingGenericDeleteError: {
      invoke: {
        src: 'editWithGenericError',
        input: ({ context }) => ({ chatId: context.chatId, messageId: context.messageId! }),
        onDone: 'awaitingUserAction',
      },
    },
    done: { type: 'final' },
  },
})

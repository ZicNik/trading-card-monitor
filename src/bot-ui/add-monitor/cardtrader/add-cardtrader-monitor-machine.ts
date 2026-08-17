/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ReplyKeyboard } from '@/bot-ui/bot-output'
import { EditedMessage, Message } from '@/bot-ui/views'
import type { AddMonitorInput } from '@/core'
import { assign, fromPromise, not, setup, type ActorSystem, type ActorSystemInfo } from 'xstate'
import { printingsSubmissionPayload, type PrintingsSelectionState } from '../printings-selection-presenter'

export const addCardTraderMonitorMachineId = 'addCardTraderMonitorMachine'

export interface AddCardTraderMonitorMachineContext {
  chatId: string
  messageId?: string
  cardName?: string
  printingsSelection?: PrintingsSelectionState
  maxPrice?: string
  foil?: boolean
  ctZero?: boolean
}

const askForFoilMessage = 'Do you want the card to be foil?'
const foilYesPayload = 'foil-yes'
const foilNoPayload = 'foil-no'
const askForCtZeroMessage = 'Do you want to buy using CardTrader Zero?'
const ctZeroYesPayload = 'ct-zero-yes'
const ctZeroNoPayload = 'ct-zero-no'

export const addCardTraderMonitorMachine = setup({
  types: {
    input: {} as {
      chatId: string
    },
    context: {} as AddCardTraderMonitorMachineContext,
    events: {} as
    | { type: 'message', text: string }
    | { type: 'buttonPress', payload: string },
  },
  guards: {
    isButtonPress: ({ event }) => event.type === 'buttonPress',
    isPrintingsSubmission: ({ event }) => event.type === 'buttonPress' && event.payload === printingsSubmissionPayload,
    isValidMaxPrice: ({ event }) => event.type === 'message' && /^(0|[1-9]\d*)([.,]\d{2})?$/.test(event.text),
  },
  actions: {
    setPrintingsSelectionPresenterState: ({ context, system }) => { system.env.printingsSelectionPresenter.state = context.printingsSelection! },
    togglePrinting: assign({ printingsSelection: ({ context, event, system }) => {
      if (event.type !== 'buttonPress')
        return context.printingsSelection
      const presenter = system.env.printingsSelectionPresenter
      presenter.state = context.printingsSelection!
      presenter.togglePrinting(parseInt(event.payload))
      return presenter.state
    } }),
    submitPrintings: assign({ printingsSelection: ({ context, system }) => {
      const presenter = system.env.printingsSelectionPresenter
      presenter.state = context.printingsSelection!
      presenter.submit()
      return presenter.state
    } }),
    assignFoil: assign({ foil: ({ event }) => {
      if (event.type !== 'buttonPress')
        return undefined
      switch (event.payload) {
        case foilYesPayload:
          return true
        case foilNoPayload:
          return false
        default:
          return undefined
      }
    } }),
    assignCtZero: assign({ ctZero: ({ event }) => {
      if (event.type !== 'buttonPress')
        return undefined
      switch (event.payload) {
        case ctZeroYesPayload:
          return true
        case ctZeroNoPayload:
          return false
        default:
          return undefined
      }
    } }),
  },
  actors: {
    askForCardName: Message.withText('Which card would you like to monitor on CardTrader?').toActor(),
    fetchPrintings: fromPromise(async ({ input, system }: { input: { cardName: string }, system: ActorSystem<ActorSystemInfo> }) => {
      await system.env.exactSearchRequestedUseCase.execute({ cardName: input.cardName, market: 'cardtrader' })
      return system.env.printingsSelectionPresenter.state
    }),
    showPrintingsFetchError: Message.withText('Something went wrong. Try again: which card are you loooking for?').toActor(),
    askForPrintingsSelection: Message.withViewModel(({ env }) => env.printingsSelectionPresenter.vm).toActor(),
    editPrintingsSelection: EditedMessage.withViewModel(({ env }) => env.printingsSelectionPresenter.vm).toActor(),
    askForMaxPrice: Message.withText('What is the maximum price, in euros, you are willing to pay for this card?').toActor(),
    showMaxPriceError: Message.withText('This is not a valid amount. Try again.').toActor(),
    askForFoil: Message.withText(askForFoilMessage, {
      keyboard: ReplyKeyboard.from([
        [['Yes', foilYesPayload], ['No', foilNoPayload]],
        ['Any'],
      ]),
    }).toActor(),
    submitFoil: EditedMessage.withDynamicText((input: { foil: boolean | undefined }) =>
      `${askForFoilMessage} *${toYesOrNoOrAny(input.foil)}*`, { formatting: 'markdown' },
    ).toActor(),
    askForCtZero: Message.withText(askForCtZeroMessage, {
      keyboard: ReplyKeyboard.from([
        [['Yes', ctZeroYesPayload], ['No', ctZeroNoPayload]],
        ['Any'],
      ]),
    }).toActor(),
    submitCtZero: EditedMessage.withDynamicText((input: { ctZero: boolean | undefined }) =>
      `${askForCtZeroMessage} *${toYesOrNoOrAny(input.ctZero)}*`, { formatting: 'markdown' },
    ).toActor(),
    addMonitor: fromPromise(({ input, system }: { input: AddMonitorInput, system: ActorSystem<ActorSystemInfo> }) =>
      system.env.addMonitorUseCase.execute(input)),
    showAddMonitorSuccess: Message.withText('Well done! The card monitor was successfully set.').toActor(),
    showAddMonitorError: Message.withText('Oops... Something went wrong and the card monitor couldn\'t be correctly set. You can try again later.').toActor(),
  },
}).createMachine({
  context: ({ input }) => ({ chatId: input.chatId }),
  initial: 'askingForCardName',
  states: {
    askingForCardName: {
      invoke: {
        src: 'askForCardName',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: 'awaitingForCardName',
      },
    },
    awaitingForCardName: {
      on: {
        message: {
          actions: assign({ cardName: ({ event }) => event.text }),
          target: 'fetchingPrintings',
        },
      },
    },
    fetchingPrintings: {
      invoke: {
        src: 'fetchPrintings',
        input: ({ context }) => ({ cardName: context.cardName! }),
        onError: 'printingsFetchError',
        onDone: {
          target: 'askingForPrintingsSelection',
          actions: assign({ printingsSelection: ({ event }) => event.output }),
        },
      },
    },
    printingsFetchError: {
      invoke: {
        src: 'showPrintingsFetchError',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: 'awaitingForCardName',
      },
    },
    askingForPrintingsSelection: {
      invoke: {
        src: 'askForPrintingsSelection',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: {
          target: 'awaitingForPrintingsSelection',
          actions: assign({ messageId: ({ event }) => event.output.id }),
        },
      },
    },
    awaitingForPrintingsSelection: {
      on: {
        buttonPress: [{
          guard: not('isPrintingsSubmission'),
          actions: 'togglePrinting',
          target: 'togglingPrinting',
        }, {
          guard: 'isPrintingsSubmission',
          actions: 'submitPrintings',
          target: 'submittingPrintings',
        }],
      },
    },
    togglingPrinting: {
      invoke: {
        src: 'editPrintingsSelection',
        input: ({ context }) => ({ chatId: context.chatId, messageId: context.messageId! }),
        onDone: 'awaitingForPrintingsSelection',
      },
    },
    submittingPrintings: {
      invoke: {
        src: 'editPrintingsSelection',
        input: ({ context }) => ({ chatId: context.chatId, messageId: context.messageId! }),
        onDone: 'askingForMaxPrice',
      },
    },
    askingForMaxPrice: {
      invoke: {
        src: 'askForMaxPrice',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: 'awaitingForMaxPrice',
      },
    },
    awaitingForMaxPrice: {
      on: {
        message: [{
          guard: 'isValidMaxPrice',
          actions: assign({ maxPrice: ({ event }) => event.text }),
          target: 'askingForFoil',
        }, {
          guard: not('isValidMaxPrice'),
          target: 'showingMaxPriceError',
        }],
      },
    },
    showingMaxPriceError: {
      invoke: {
        src: 'showMaxPriceError',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: 'awaitingForMaxPrice',
      },
    },
    askingForFoil: {
      invoke: {
        src: 'askForFoil',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: {
          target: 'awaitingForFoil',
          actions: assign({ messageId: ({ event }) => event.output.id }),
        },
      },
    },
    awaitingForFoil: {
      on: {
        buttonPress: {
          actions: 'assignFoil',
          target: 'submittingFoil',
        },
      },
    },
    submittingFoil: {
      invoke: {
        src: 'submitFoil',
        input: ({ context }) => ({ chatId: context.chatId, messageId: context.messageId!, foil: context.foil }),
        onDone: 'askingForCtZero',
      },
    },
    askingForCtZero: {
      invoke: {
        src: 'askForCtZero',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: {
          target: 'awaitingForCtZero',
          actions: assign({ messageId: ({ event }) => event.output.id }),
        },
      },
    },
    awaitingForCtZero: {
      on: {
        buttonPress: {
          actions: 'assignCtZero',
          target: 'submittingCtZero',
        },
      },
    },
    submittingCtZero: {
      invoke: {
        src: 'submitCtZero',
        input: ({ context }) => ({ chatId: context.chatId, messageId: context.messageId!, ctZero: context.ctZero }),
        onDone: 'addingMonitor',
      },
    },
    addingMonitor: {
      invoke: {
        src: 'addMonitor',
        input: ({ context }) => toAddMonitorInput(context),
        onDone: 'showingAddMonitorSuccess',
        onError: 'showingAddMonitorError',
      },
    },
    showingAddMonitorSuccess: {
      invoke: {
        src: 'showAddMonitorSuccess',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: 'done',
      },
    },
    showingAddMonitorError: {
      invoke: {
        src: 'showAddMonitorError',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: 'done',
      },
    },
    done: { type: 'final' },
  },
})

function toYesOrNoOrAny(b: boolean | undefined): string {
  switch (b) {
    case true:
      return 'Yes'
    case false:
      return 'No'
    case undefined:
      return 'Any'
  }
}

function toAddMonitorInput(context: AddCardTraderMonitorMachineContext): AddMonitorInput {
  return {
    userId: context.chatId,
    cardName: context.cardName!,
    baseFilters: {
      printings: context.printingsSelection!.printings.filter((_, i) =>
        context.printingsSelection!.selection[i]),
      maxEuroCents: parseInt(context.maxPrice!),
      ...(context.foil !== undefined ? { foil: context.foil } : {}),
    },
    marketFilters: {
      market: 'cardtrader',
      ...(context.ctZero !== undefined ? { ctZero: context.ctZero } : {}),
    },
  }
}

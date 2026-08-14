import { ReplyKeyboard, type BotOutputPort } from '@/bot-ui/bot-output'
import type { ExactSearchRequestedUseCase } from '@/search'
import { assign, fromPromise, not, setup } from 'xstate'
import { PrintingsSelectionPresenter, printingsSubmissionPayload, type PrintingsSelectionState } from '../printings-selection-presenter'

export const addCardTraderMonitorMachineId = 'addCardTraderMonitorMachine'

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
    context: {} as {
      chatId: string
      messageId?: string
      cardName?: string
      printingsSelection?: PrintingsSelectionState
      maxPrice?: string
      foil?: boolean
      ctZero?: boolean
    },
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
    askForCardName: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'Which card would you like to monitor on CardTrader?')),
    fetchPrintings: fromPromise(async ({ input }: { input: { useCase: ExactSearchRequestedUseCase, presenter: PrintingsSelectionPresenter, cardName: string } }) => {
      await input.useCase.execute({ cardName: input.cardName, market: 'cardtrader' })
      return input.presenter.state
    }),
    showPrintingsFetchError: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'Something went wrong. Try again: which card are you loooking for?')),
    askForPrintingsSelection: fromPromise(async ({ input }: { input: { port: BotOutputPort, chatId: string, presenter: PrintingsSelectionPresenter } }) => {
      const vm = input.presenter.vm
      return await input.port.sendMessage(input.chatId, vm.text, vm.options)
    }),
    editPrintingsSelection: fromPromise(async ({ input }: {
      input: {
        port: BotOutputPort
        presenter: PrintingsSelectionPresenter
        chatId: string
        messageId: string
      }
    }) => {
      const presenter = input.presenter
      const vm = presenter.vm
      await input.port.editMessage(input.chatId, input.messageId, vm.text, vm.options)
      return { isSubmission: presenter.state.submitted }
    }),
    askForMaxPrice: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'What is the maximum price, in euros, you are willing to pay for this card?')),
    showMaxPriceError: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, 'This is not a valid amount. Try again.')),
    askForFoil: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, askForFoilMessage, {
        keyboard: ReplyKeyboard.from([
          [['Yes', foilYesPayload], ['No', foilNoPayload]],
          ['Any'],
        ]),
      })),
    submitFoil: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string, messageId: string, foil: boolean | undefined } }) =>
      input.port.editMessage(input.chatId, input.messageId, `${askForFoilMessage} *${toYesOrNoOrAny(input.foil)}*`, { formatting: 'markdown' })),
    askForCtZero: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string } }) =>
      input.port.sendMessage(input.chatId, askForCtZeroMessage, {
        keyboard: ReplyKeyboard.from([
          [['Yes', ctZeroYesPayload], ['No', ctZeroNoPayload]],
          ['Any'],
        ]),
      })),
    submitCtZero: fromPromise(({ input }: { input: { port: BotOutputPort, chatId: string, messageId: string, ctZero: boolean | undefined } }) =>
      input.port.editMessage(input.chatId, input.messageId, `${askForCtZeroMessage} *${toYesOrNoOrAny(input.ctZero)}*`, { formatting: 'markdown' })),
  },
}).createMachine({
  context: ({ input }) => ({ chatId: input.chatId }),
  initial: 'askingForCardName',
  states: {
    askingForCardName: {
      invoke: {
        src: 'askForCardName',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
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
        input: ({ context, self }) => ({
          useCase: self.system.env.exactSearchRequestedUseCase,
          presenter: self.system.env.printingsSelectionPresenter,
          cardName: context.cardName!,
        }),
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
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
        onDone: 'awaitingForCardName',
      },
    },
    askingForPrintingsSelection: {
      invoke: {
        src: 'askForPrintingsSelection',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId, presenter: self.system.env.printingsSelectionPresenter }),
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
          target: 'editingPrintingsSelection',
        }, {
          guard: 'isPrintingsSubmission',
          actions: 'submitPrintings',
          target: 'editingPrintingsSelection',
        }],
      },
    },
    editingPrintingsSelection: {
      invoke: {
        src: 'editPrintingsSelection',
        input: ({ context, self }) => ({
          port: self.system.env.outputPort,
          presenter: self.system.env.printingsSelectionPresenter,
          chatId: context.chatId,
          messageId: context.messageId!,
        }),
        onDone: [{
          guard: ({ event }) => !event.output.isSubmission,
          target: 'awaitingForPrintingsSelection',
        }, {
          guard: ({ event }) => event.output.isSubmission,
          target: 'askingForMaxPrice',
        }],
      },
    },
    askingForMaxPrice: {
      invoke: {
        src: 'askForMaxPrice',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
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
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
        onDone: 'awaitingForMaxPrice',
      },
    },
    askingForFoil: {
      invoke: {
        src: 'askForFoil',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
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
        input: ({ context, self }) => ({
          port: self.system.env.outputPort,
          chatId: context.chatId,
          messageId: context.messageId!,
          foil: context.foil,
        }),
        onDone: 'askingForCtZero',
      },
    },
    askingForCtZero: {
      invoke: {
        src: 'askForCtZero',
        input: ({ context, self }) => ({ port: self.system.env.outputPort, chatId: context.chatId }),
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
        input: ({ context, self }) => ({
          port: self.system.env.outputPort,
          chatId: context.chatId,
          messageId: context.messageId!,
          ctZero: context.ctZero,
        }),
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

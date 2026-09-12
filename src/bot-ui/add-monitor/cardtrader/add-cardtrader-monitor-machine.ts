/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { assign, fromPromise, not, setup, type ActorSystem, type ActorSystemInfo } from 'xstate'

import { ReplyKeyboard, ReplyKeyboardButton } from '@/bot-ui/bot-output'
import { EditedMessage, Message } from '@/bot-ui/views'
import type { CardCondition } from '@/core'
import type { AddMonitorInput } from '@/use-cases'

import { printingId, printingsSelectAllPayload, printingsSubmissionPayload, type PrintingsSelectionState } from '../printings-selection-presenter'

export const addCardTraderMonitorMachineId = 'addCardTraderMonitorMachine'

export interface AddCardTraderMonitorMachineContext {
  chatId: string
  messageId?: string
  cardName?: string
  printingsSelection?: PrintingsSelectionState
  maxPrice?: string
  minCondition?: Condition
  language?: Language
  foil?: boolean
  ctZero?: boolean
}

const choiceYesPayload = 'choice-yes'
const choiceYesLabel = 'Yes'
const choiceNoPayload = 'choice-no'
const choiceNoLabel = 'No'
const choiceAnyPayload = 'choice-any'
const choiceAnyLabel = 'Any'
function mapYesNoAnyPayload(payload: string): boolean | undefined {
  switch (payload) {
    case choiceYesPayload: return true
    case choiceNoPayload: return false
    case choiceAnyPayload: return undefined
    default: throw new Error(`Unexpected "${payload}" payload from yes/no/any choice.`)
  }
}
function yesNoAnyLabel(choice: boolean | undefined): string {
  switch (choice) {
    case true: return choiceYesLabel
    case false: return choiceNoLabel
    case undefined: return choiceAnyLabel
  }
}
const yesNoAnyKeyboard = ReplyKeyboard.from([
  [[choiceYesLabel, choiceYesPayload], [choiceNoLabel, choiceNoPayload]],
  [[choiceAnyLabel, choiceAnyPayload]],
])

const askForMinConditionMessage = 'What minimum conditions must the card meet?'
const conditions = ['near-mint', 'moderately-played'] as const
type Condition = typeof conditions[number]
function conditionLabel(c: Condition | undefined): string {
  switch (c) {
    case 'near-mint': return 'Near Mint'
    case 'moderately-played': return 'Moderately Played'
    case undefined: return choiceAnyLabel
  }
}

const askForLanguageMessage = 'What language does it need to be in?'
const languages = ['en', 'it', 'es', 'fr', 'de', 'ru', 'jp', 'cn'] as const
type Language = typeof languages[number]
function languageLabel(l: Language | undefined): string {
  return l === undefined ? choiceAnyLabel : l.toUpperCase()
}

const askForFoilMessage = 'Do you want the card to be foil?'
const askForCtZeroMessage = 'Do you want to buy using CardTrader Zero?'

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
    isPrintingToggling: ({ event, context }) => event.type === 'buttonPress'
      && (context.printingsSelection?.printings.some(p => printingId(p) === event.payload) ?? false),
    isPrintingsSelectAllAndIsAllowed: ({ event, context }) => event.type === 'buttonPress'
      && event.payload === printingsSelectAllPayload
      && (context.printingsSelection?.printings.some(p => !p.selected) ?? false),
    isPrintingsSubmission: ({ event }) => event.type === 'buttonPress' && event.payload === printingsSubmissionPayload,
    isValidMaxPrice: ({ event }) => event.type === 'message' && /^(0|[1-9]\d*)(\.\d{2})?$/.test(event.text),
    isValidMinCondition: ({ event }) => event.type === 'buttonPress'
      && (conditions.some(c => event.payload === c) || event.payload === choiceAnyPayload),
    isValidLanguage: ({ event }) => event.type === 'buttonPress'
      && (languages.some(l => event.payload === l) || event.payload === choiceAnyPayload),
    isValidYesOrNoOrAny: ({ event }) => event.type === 'buttonPress'
      && (event.payload === choiceYesPayload || event.payload === choiceNoPayload || event.payload === choiceAnyPayload),
  },
  actions: {
    setPrintingsSelectionPresenterState: ({ context, system }) => { system.env.printingsSelectionPresenter.state = context.printingsSelection! },
    selectAllPrintings: assign({ printingsSelection: ({ context, event, system }) => {
      if (event.type !== 'buttonPress')
        return context.printingsSelection
      const presenter = system.env.printingsSelectionPresenter
      presenter.state = context.printingsSelection!
      presenter.selectAll()
      return presenter.state
    } }),
    togglePrinting: assign({ printingsSelection: ({ context, event, system }) => {
      if (event.type !== 'buttonPress')
        return context.printingsSelection
      const presenter = system.env.printingsSelectionPresenter
      presenter.state = context.printingsSelection!
      presenter.togglePrinting(event.payload)
      return presenter.state
    } }),
    submitPrintings: assign({ printingsSelection: ({ context, system }) => {
      const presenter = system.env.printingsSelectionPresenter
      presenter.state = context.printingsSelection!
      presenter.submit()
      return presenter.state
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
    askForMinCondition: Message.withText(askForMinConditionMessage, {
      keyboard: [
        conditions.map(c => ReplyKeyboardButton.create(conditionLabel(c), c)),
        [ReplyKeyboardButton.create(choiceAnyLabel, choiceAnyPayload)],
      ],
    }).toActor(),
    submitMinCondition: EditedMessage.withDynamicText((input: { minCondition: Condition | undefined }) =>
      `${askForMinConditionMessage} *${conditionLabel(input.minCondition)}*`, { formatting: 'markdown' },
    ).toActor(),
    askForLanguage: Message.withText(askForLanguageMessage, {
      keyboard: (() => {
        const languageButtons = languages.map(l => ReplyKeyboardButton.create(languageLabel(l), l))
        return [
          languageButtons.slice(0, 4),
          languageButtons.slice(4),
          [ReplyKeyboardButton.create(choiceAnyLabel, choiceAnyPayload)],
        ]
      })(),
    }).toActor(),
    submitLanguage: EditedMessage.withDynamicText((input: { language: Language | undefined }) =>
      `${askForLanguageMessage} *${languageLabel(input.language)}*`, { formatting: 'markdown' },
    ).toActor(),
    askForFoil: Message.withText(askForFoilMessage, { keyboard: yesNoAnyKeyboard }).toActor(),
    submitFoil: EditedMessage.withDynamicText((input: { foil: boolean | undefined }) =>
      `${askForFoilMessage} *${yesNoAnyLabel(input.foil)}*`, { formatting: 'markdown' },
    ).toActor(),
    askForCtZero: Message.withText(askForCtZeroMessage, { keyboard: yesNoAnyKeyboard }).toActor(),
    submitCtZero: EditedMessage.withDynamicText((input: { ctZero: boolean | undefined }) =>
      `${askForCtZeroMessage} *${yesNoAnyLabel(input.ctZero)}*`, { formatting: 'markdown' },
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
          actions: assign({
            cardName: ({ event }) => event.output.cardName,
            printingsSelection: ({ event }) => event.output,
          }),
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
          guard: 'isPrintingToggling',
          actions: 'togglePrinting',
          target: 'updatingPrintingsSelection',
        }, {
          guard: 'isPrintingsSelectAllAndIsAllowed',
          actions: 'selectAllPrintings',
          target: 'updatingPrintingsSelection',
        }, {
          guard: 'isPrintingsSubmission',
          actions: 'submitPrintings',
          target: 'submittingPrintings',
        }],
      },
    },
    updatingPrintingsSelection: {
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
          target: 'askingForMinCondition',
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
    askingForMinCondition: {
      invoke: {
        src: 'askForMinCondition',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: {
          target: 'awaitingForMinCondition',
          actions: assign({ messageId: ({ event }) => event.output.id }),
        },
      },
    },
    awaitingForMinCondition: {
      on: {
        buttonPress: {
          guard: 'isValidMinCondition',
          actions: assign({ minCondition: ({ event }) =>
            event.payload === choiceAnyPayload ? undefined : event.payload as Condition }),
          target: 'submittingMinCondition',
        },
      },
    },
    submittingMinCondition: {
      invoke: {
        src: 'submitMinCondition',
        input: ({ context }) => ({ chatId: context.chatId, messageId: context.messageId!, minCondition: context.minCondition }),
        onDone: 'askingForLanguage',
      },
    },
    askingForLanguage: {
      invoke: {
        src: 'askForLanguage',
        input: ({ context }) => ({ chatId: context.chatId }),
        onDone: {
          target: 'awaitingForLanguage',
          actions: assign({ messageId: ({ event }) => event.output.id }),
        },
      },
    },
    awaitingForLanguage: {
      on: {
        buttonPress: {
          guard: 'isValidLanguage',
          actions: assign({ language: ({ event }) =>
            event.payload === choiceAnyPayload ? undefined : event.payload as Language }),
          target: 'submittingLanguage',
        },
      },
    },
    submittingLanguage: {
      invoke: {
        src: 'submitLanguage',
        input: ({ context }) => ({ chatId: context.chatId, messageId: context.messageId!, language: context.language }),
        onDone: 'askingForFoil',
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
          guard: 'isValidYesOrNoOrAny',
          actions: assign({ foil: ({ event }) => mapYesNoAnyPayload(event.payload) }),
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
          guard: 'isValidYesOrNoOrAny',
          actions: assign({ ctZero: ({ event }) => mapYesNoAnyPayload(event.payload) }),
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

function toAddMonitorInput(context: AddCardTraderMonitorMachineContext): AddMonitorInput {
  return {
    userId: context.chatId,
    cardName: context.cardName!,
    baseFilters: {
      printings: context.printingsSelection!.printings.filter(p => p.selected),
      maxEuroCents: Math.round(parseFloat(context.maxPrice!) * 100),
      ...(context.minCondition !== undefined ? { minCondition: toCardCondition(context.minCondition) } : {}),
      ...(context.language !== undefined ? { language: context.language } : {}),
      ...(context.foil !== undefined ? { foil: context.foil } : {}),
    },
    marketFilters: {
      market: 'cardtrader',
      ...(context.ctZero !== undefined ? { ctZero: context.ctZero } : {}),
    },
  }
}

function toCardCondition(condition: Condition): CardCondition {
  switch (condition) {
    case 'near-mint': return 'near-mint'
    case 'moderately-played': return 'played'
  }
}

import type { StateMachine } from 'xstate'

import type { BotInput } from './bot-input'

export type RootMachineEvent = BotInput

export interface CreateRootMachineInput { chatId: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RootMachine = StateMachine<any, RootMachineEvent, any, any, any, any, any, any, any, CreateRootMachineInput, any, any, any, any>

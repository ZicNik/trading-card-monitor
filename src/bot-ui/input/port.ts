import type { BotInputFilter, BotInputHandler } from './types'

/** Object responsible for the registration of bot input handlers.
 *
 * Refer to the concrete implementation for important details, such as if the registration
 * order matters, or how multiple handlers are executed, etc.
 */
export interface BotInputPort {

  /** @param filter Handler is called only when this predicate is true. */
  onAny(
    handler: BotInputHandler,
    options: { filter?: BotInputFilter },
  ): void

  /** @param filter Handler is called only when this predicate is true. */
  onCommand(
    command: string,
    handler: BotInputHandler<'command'>,
    options: { filter?: BotInputFilter<'command'> },
  ): void

  /** @param filter Handler is called only when this predicate is true. */
  onMessage(
    handler: BotInputHandler<'message'>,
    options: { filter?: BotInputFilter<'message'> },
  ): void

  /** @param filter Handler is called only when this predicate is true. */
  onButtonPress(
    handler: BotInputHandler<'buttonPress'>,
    options: { filter?: BotInputFilter<'buttonPress'> },
  ): void
}

interface BotInputContextMap {
  command: unknown
  message: Readonly<{
    text: string
  }>
}

type BotInputBaseContext = Readonly<{
  chatId: string
}>

export type BotInputType = keyof BotInputContextMap

export type BotInputContext<T extends BotInputType = BotInputType> = BotInputBaseContext & BotInputContextMap[T]

export type BotInputHandler<T extends BotInputType> = (context: BotInputContext<T>) => void | Promise<void>

export type BotInputFilter<T extends BotInputType> = (context: BotInputContext<T>) => boolean

/** Object responsible for the registration of bot input handlers.
 *
 * Refer to the concrete implementation for important details, such as if the registration
 * order matters, or how multiple handlers are executed, etc.
 */
export interface BotInputPort {

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
}

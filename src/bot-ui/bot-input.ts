interface BotInputMap {
  command: {
    input: { command: string }
    context: { chatId: string }
  }
  message: {
    input: { text: string }
    context: { chatId: string }
  }
  buttonPress: {
    input: { payload: string }
    context: { chatId: string }
  }
}

export type BotInputType = keyof BotInputMap

export type BotInput<T extends BotInputType = BotInputType> = Readonly<{
  [S in T]: { type: S } & BotInputMap[S]['input']
}[T]>

interface BotInputBaseContext {
  userId?: string
}

export type BotInputContext<T extends BotInputType | undefined = undefined> = Readonly<BotInputBaseContext
  & (T extends BotInputType
    ? { [S in T]: BotInputMap[S]['input'] & BotInputMap[S]['context'] }[T]
    : unknown)>

export type BotInputHandler<T extends BotInputType | undefined = undefined> = (context: BotInputContext<T>) => Promise<void>

export type BotInputFilter<T extends BotInputType | undefined = undefined> = (context: BotInputContext<T>) => boolean

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

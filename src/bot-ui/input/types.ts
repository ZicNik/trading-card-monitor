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

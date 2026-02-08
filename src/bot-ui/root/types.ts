export type RootEvent
  = | { type: 'idle' }
    | { type: 'search' }

interface InheritedContext { chatId: string }
type LocalContext = InheritedContext
type ChildContext = { bar: number } | { baz: string }

export type RootContext = InheritedContext & (LocalContext | ChildContext)

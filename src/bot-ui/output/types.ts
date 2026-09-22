export type MessageInfo = Readonly<{ id: string }>

export type MessageOptions = Partial<Readonly<{
  formatting: MessageFormatting
  keyboard: ReplyKeyboard
  linkPreview: boolean
}>>

export type MessageFormatting = 'markdown' | 'html'

export type ReplyKeyboard = readonly ReplyKeyboardButton[][]

export const ReplyKeyboard = {
  /** Each button is represented by a `[label, payload]` string pair; or just a single string, if label and payload coincide. */
  from(entries: ([string, string] | string)[][]): ReplyKeyboard {
    return entries.map(row =>
      row.map(entry => typeof entry === 'string'
        ? ReplyKeyboardButton.create(entry)
        : ReplyKeyboardButton.create(entry[0], entry[1])))
  },
}

export type ReplyKeyboardButton = Readonly<{ label: string, payload: string }>

export const ReplyKeyboardButton = {
  create(text: string, payload?: string): ReplyKeyboardButton {
    return { label: text, payload: payload ?? text }
  },
}

export type SendMessageOptions = Partial<Readonly<{
  formatting: 'markdown' | 'html'
}>>

/** Object responsible for the interactions coming from the bot. */
export interface BotOutputPort {
  sendMessage(chatId: string, text: string, options?: SendMessageOptions): Promise<void>
}

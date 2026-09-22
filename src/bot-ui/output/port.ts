import type { MessageInfo, MessageOptions } from './types'

/** Object responsible for the interactions coming from the bot. */
export interface BotOutputPort {
  sendMessage(chatId: string, text: string, options?: MessageOptions): Promise<MessageInfo>
  editMessage(chatId: string, messageId: string, text: string, options?: MessageOptions): Promise<void>
}

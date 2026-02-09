/** Object responsible for the interactions coming from the bot. */
export interface BotOutputPort {
  sendMessage(chatId: string, text: string): Promise<void>
}

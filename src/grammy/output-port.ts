import type { BotOutputPort } from '@/bot-ui/bot-output'
import { GRAMMY_BOT } from './bot'

/** @see {@link https://grammy.dev/guide/api} */
export class GrammyOutputPort implements BotOutputPort {
  async sendMessage(chatId: string, text: string): Promise<void> {
    await GRAMMY_BOT.api.sendMessage(chatId, text)
  }
}

import type { BotOutputPort, SendMessageOptions } from '@/bot-ui/bot-output'
import { GRAMMY_BOT } from './bot'

/** @see {@link https://grammy.dev/guide/api} */
export class GrammyOutputPort implements BotOutputPort {
  async sendMessage(chatId: string, text: string, options?: SendMessageOptions): Promise<void> {
    await GRAMMY_BOT.api.sendMessage(chatId, text, toGrammySendMessageOptions(options))
  }
}

// MARK: - Mappers

function toGrammySendMessageOptions(options: SendMessageOptions | undefined) {
  function mapFormatting(f: SendMessageOptions['formatting']): { parse_mode?: 'Markdown' | 'HTML' } {
    switch (f) {
      case 'html':
        return { parse_mode: 'HTML' }
      case 'markdown':
        return { parse_mode: 'Markdown' }
      case undefined:
        return {}
    }
  }
  return options === undefined
    ? undefined
    : {
        ...mapFormatting(options.formatting),
      }
}

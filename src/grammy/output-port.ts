import type { BotOutputPort, MessageFormatting, ReplyKeyboard, SendMessageOptions } from '@/bot-ui/bot-output'
import { InlineKeyboard } from 'grammy'
import { GRAMMY_BOT } from './bot'

/** @see {@link https://grammy.dev/guide/api} */
export class GrammyOutputPort implements BotOutputPort {
  async sendMessage(chatId: string, text: string, options?: SendMessageOptions): Promise<void> {
    await GRAMMY_BOT.api.sendMessage(chatId, text, toGrammySendMessageOptions(options))
  }
}

// MARK: - Mappers

function toGrammySendMessageOptions(options: SendMessageOptions | undefined) {
  return options === undefined
    ? undefined
    : {
        ...(options.formatting !== undefined ? { parse_mode: toGrammyParseMode(options.formatting) } : {}),
        ...(options.keyboard !== undefined ? { reply_markup: toGrammyInlineKeyboard(options.keyboard) } : {}),
      }
}

function toGrammyParseMode(formatting: MessageFormatting): 'Markdown' | 'HTML' {
  switch (formatting) {
    case 'html':
      return 'HTML'
    case 'markdown':
      return 'Markdown'
  }
}

function toGrammyInlineKeyboard(keyboard: ReplyKeyboard): InlineKeyboard {
  return new InlineKeyboard(keyboard.map(row => row.map(button => ({ text: button.label, callback_data: button.payload }))))
}

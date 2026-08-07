import type { BotOutputPort, MessageFormatting, MessageInfo, MessageOptions, ReplyKeyboard } from '@/bot-ui/bot-output'
import { InlineKeyboard } from 'grammy'
import type { Message } from 'grammy/types'
import { GRAMMY_BOT } from './bot'

/** @see {@link https://grammy.dev/guide/api} */
export class GrammyOutputPort implements BotOutputPort {
  async sendMessage(chatId: string, text: string, options?: MessageOptions): Promise<MessageInfo> {
    const message = await GRAMMY_BOT.api.sendMessage(chatId, text, toGrammyMessageOptions(options))
    return toMessageInfo(message)
  }

  async editMessage(chatId: string, messageId: number, text: string, options?: MessageOptions): Promise<void> {
    await GRAMMY_BOT.api.editMessageText(chatId, messageId, text, toGrammyMessageOptions(options))
  }
}

// MARK: - Mappers

function toMessageInfo(message: Message): MessageInfo {
  return { id: message.message_id.toString() }
}

function toGrammyMessageOptions(options: MessageOptions | undefined) {
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

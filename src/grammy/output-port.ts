import { InlineKeyboard } from 'grammy'
import type { Message } from 'grammy/types'

import type { BotOutputPort, MessageFormatting, MessageInfo, MessageOptions, ReplyKeyboard } from '@/bot-ui/bot-output'

import { GRAMMY_BOT } from './bot'

/** @see {@link https://grammy.dev/guide/api} */
export class GrammyOutputPort implements BotOutputPort {
  async sendMessage(chatId: string, text: string, options?: MessageOptions): Promise<MessageInfo> {
    const message = await GRAMMY_BOT.api.sendMessage(chatId, text, toGrammyMessageOptions(options))
    return toMessageInfo(message)
  }

  async editMessage(chatId: string, messageId: string, text: string, options?: MessageOptions): Promise<void> {
    await GRAMMY_BOT.api.editMessageText(chatId, parseInt(messageId), text, toGrammyMessageOptions(options))
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
        ...toGrammyParseMode(options.formatting),
        ...toGrammyInlineKeyboard(options.keyboard),
        ...toGrammyLinkPreview(options.linkPreview),
      }
}

function toGrammyParseMode(formatting: MessageFormatting | undefined) {
  if (formatting === undefined)
    return {}
  let parse_mode: 'HTML' | 'MarkdownV2'
  switch (formatting) {
    case 'html':
      parse_mode = 'HTML'
      break
    case 'markdown':
      parse_mode = 'MarkdownV2'
      break
  }
  return { parse_mode }
}

function toGrammyInlineKeyboard(keyboard: ReplyKeyboard | undefined) {
  return keyboard === undefined
    ? {}
    : { reply_markup: new InlineKeyboard(keyboard.map(row => row.map(
        button => ({ text: button.label, callback_data: button.payload })))) }
}

function toGrammyLinkPreview(linkPreview: boolean | undefined) {
  return linkPreview === undefined
    ? {}
    : { link_preview_options: { is_disabled: linkPreview } }
}

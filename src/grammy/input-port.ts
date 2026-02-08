import type { BotInputContext, BotInputFilter, BotInputHandler, BotInputPort, BotInputType } from '@/bot-ui/bot-input'
import { GRAMMY_BOT } from './bot'

/** @see {@link https://grammy.dev/guide/middleware} */
export class GrammyInputPort implements BotInputPort {
  onCommand(
    command: string,
    handler: BotInputHandler<'command'>,
    options: { filter?: BotInputFilter<'command'> } = {},
  ): void {
    GRAMMY_BOT.command(command, async (ctx) => {
      const chatId = ctx.chatId.toString()
      await this.handle({ chatId }, handler, options.filter)
    })
  }

  onMessage(
    handler: BotInputHandler<'message'>,
    options: { filter?: BotInputFilter<'message'> } = {},
  ): void {
    GRAMMY_BOT.on('message:text', async (ctx) => {
      const text = ctx.message.text
      const chatId = ctx.chatId.toString()
      await this.handle({ chatId, text }, handler, options.filter)
    })
  }

  private async handle<T extends BotInputType>(
    context: BotInputContext<T>,
    handler: BotInputHandler<T>,
    filter?: BotInputFilter<T>,
  ): Promise<void> {
    if (filter !== undefined && !filter(context))
      return
    await handler(context)
  }
}

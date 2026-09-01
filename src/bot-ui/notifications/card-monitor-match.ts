import { formatEuroCents } from '@/common/utilities'
import type { MatchNotificationListingData, NotifyCardMonitorMatchOutput, NotifyCardMonitorMatchOutputPort } from '@/use-cases'

import type { BotOutputPort } from '../bot-output'
import type { MessageViewModel } from '../views'

export type MatchNotificationViewModel = MessageViewModel & { readonly chatId: string }

export class CardMonitorMatchNotifier implements NotifyCardMonitorMatchOutputPort {
  constructor(private readonly view: MatchNotificationRendering) {}

  async present(output: NotifyCardMonitorMatchOutput): Promise<void> {
    await this.view.render({
      chatId: output.userId,
      text: messageText(output.cardName, output.listings),
      options: { formatting: 'html', linkPreview: false },
    })
  }
}

function messageText(cardName: string, listings: readonly MatchNotificationListingData[]): string {
  return `Match${listings.length > 1 ? 'es' : ''} found for ${cardName}!\n\n`
    + listings.map(listingText).join('\n\n')
}

function listingText(listing: MatchNotificationListingData) {
  return `<a href="${listing.url}">${listing.setName} [${listing.setCode} ${listing.collectorNum}]</a>
<b>Price:</b> ${formatEuroCents(listing.euroCents)}
<b>Foil:</b> ${listing.foil ? 'yes' : 'no'}`
}

// MARK: - View

export interface MatchNotificationRendering {
  render(vm: MatchNotificationViewModel): Promise<void>
}

export class MatchNotificationView implements MatchNotificationRendering {
  constructor(private readonly port: BotOutputPort) {}

  async render(vm: MatchNotificationViewModel): Promise<void> {
    await this.port.sendMessage(vm.chatId, vm.text, vm.options)
  }
}

// MARK: - Factories

export function createCardMonitorMatchNotifier(port: BotOutputPort): CardMonitorMatchNotifier {
  return new CardMonitorMatchNotifier(new MatchNotificationView(port))
}

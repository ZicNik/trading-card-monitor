import { formatEuroCents } from '@/common/utilities'
import type { MatchNotificationListingData, NotifyCardMonitorMatchOutput, NotifyCardMonitorMatchOutputPort } from '@/use-cases'

import type { BotOutputPort } from '@/bot-ui/output'
import type { MessageViewModel } from '@/bot-ui/views'

const maxPresentedCount = 10

export type MatchNotificationViewModel = MessageViewModel & { readonly chatId: string }

export class CardMonitorMatchNotifier implements NotifyCardMonitorMatchOutputPort {
  constructor(private readonly view: MatchNotificationRendering) {}

  async present(output: NotifyCardMonitorMatchOutput): Promise<void> {
    await this.view.render({
      chatId: output.userId,
      text: text(output.cardName, output.listings),
      options: { formatting: 'html', linkPreview: false },
    })
  }
}

function text(cardName: string, listings: readonly MatchNotificationListingData[]): string {
  const extraListingsCount = listings.length - maxPresentedCount
  return `<b>Match${listings.length > 1 ? 'es' : ''} found for <em>${cardName}</em>!</b>\n`
    + (extraListingsCount > 0 ? `<em>(Showing the top ${maxPresentedCount} sorted by price)</em>\n\n` : '\n')
    + listings
      .toSorted((a, b) => a.euroCents - b.euroCents)
      .slice(0, maxPresentedCount)
      .map(listingText).join('\n\n')
      + (extraListingsCount > 0 ? `\n\n<em>...and ${extraListingsCount} more result${extraListingsCount > 1 ? 's' : ''}.</em>` : '')
}

function listingText(listing: MatchNotificationListingData) {
  return `<a href="${listing.url}">${listing.setName} [${listing.setCode} ${listing.collectorNum}]</a>
<b>Seller:</b> ${listing.seller}
<b>Price:</b> ${formatEuroCents(listing.euroCents)}`
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

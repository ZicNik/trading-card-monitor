import type { DomainEvent, DomainEventPublisher, DomainEventType } from '@/core'

export type DomainEventHandler<T extends DomainEventType> = (event: DomainEvent<T>) => Promise<void>

type HandlersMap = { [T in DomainEventType]?: DomainEventHandler<T>[] }

/** Component responsible for both publishing of domain events and subscription of related handlers.  */
export class EventBus implements DomainEventPublisher {
  private readonly handlersMap: HandlersMap = {}

  async publish<T extends DomainEventType>(...events: DomainEvent<T>[]): Promise<void> {
    for (const event of events)
      for (const handler of this.handlersMap[event.type] ?? [])
        await handler(event)
  }

  subscribe<T extends DomainEventType>(eventType: T, handler: DomainEventHandler<T>): void {
    if (this.handlersMap[eventType] === undefined)
      this.handlersMap[eventType] = []
    this.handlersMap[eventType].push(handler)
  }
}

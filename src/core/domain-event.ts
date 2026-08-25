import type { CardMonitorMatched } from './card-monitor'

/** Other domain modules should extend this registry when defining their own events.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation}.
 */
export interface DomainEventRegistry {
  cardMonitorMatched: CardMonitorMatched
}

export type DomainEventType = keyof DomainEventRegistry
export type DomainEvent<T extends DomainEventType = DomainEventType> = { readonly type: T } & DomainEventRegistry[T]

export interface DomainEventPublisher {
  publish<T extends DomainEventType>(event: DomainEvent<T>): void
}

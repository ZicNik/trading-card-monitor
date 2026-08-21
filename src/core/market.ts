/** A central type-level registry for managing market-specific types.
 *
 * Provides strict decoupling between the application's core and individual market implementation details:
 * each market module must extend this interface with exactly one entry, where the key and value represent
 * respectively the unique market identifier and the particular shape of the market-dependent types.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation}.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MarketRegistry {
  // test: {
  //   listingAttributes: Readonly<{
  //     market: 'test'
  //     testAttribute: boolean
  //   }>
  //   monitorFilters: Readonly<{
  //     market: 'test'
  //     testFilter?: boolean
  //   }>
  // }
}

export type MarketType = keyof MarketRegistry

export type ListingMarketAttributes<M extends MarketType = MarketType> = MarketRegistry[M]['listingAttributes']
export type MonitorMarketFilters<M extends MarketType = MarketType> = MarketRegistry[M]['monitorFilters']
export type MonitorMarketFiltersProps<M extends MarketType = MarketType> = MarketRegistry[M]['monitorFiltersProps']

// MARK: - Factories

interface MarketFactoryRegistry<M extends MarketType> {
  monitorFilters: (props: MonitorMarketFiltersProps<M>) => MonitorMarketFilters<M>
}

export type MarketFactoryKey = keyof MarketFactoryRegistry<MarketType>
export type MarketFactory<M extends MarketType, K extends MarketFactoryKey> = MarketFactoryRegistry<M>[K]

const factoriesByMarket: { [M in MarketType]?: Partial<MarketFactoryRegistry<M>> } = {}

/** Inject with this the factories required by some of the market-related types. If not, trying to create an instance of those will trigger a runtime error.
 *
 * @see {@link MarketFactory}
  */
export function registerMarketFactory<M extends MarketType, K extends MarketFactoryKey>(market: M, key: K, factory: MarketFactory<M, K>) {
  let registry: typeof factoriesByMarket[M]
  if (factoriesByMarket[market] === undefined) {
    registry = {}
    factoriesByMarket[market] = registry
  }
  else
    registry = factoriesByMarket[market]
  registry[key] = factory
}

export const MonitorMarketFilters = {
  create<M extends MarketType>(props: MonitorMarketFiltersProps<M>): MonitorMarketFilters<M> {
    const factory = factoriesByMarket[props.market]?.monitorFilters
    if (factory === undefined)
      throw new Error(`Factory method of MonitorMarketFilters<"${props.market}"> not found. Make sure you have it injected with "registerMarketFactory".`)
    return factory(props)
  },
}

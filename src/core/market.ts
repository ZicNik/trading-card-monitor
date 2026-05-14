/** A central type-level registry for managing market-specific types.
 *
 * Provides strict decoupling between the application's core and individual market implementation details:
 * each market module must extend this interface with exactly one entry, where the key and value represent
 * respectively the unique market identifier and the particular shape of the market-dependent types.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation}.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MarketRegistry {}

export type MarketType = keyof MarketRegistry

export type ListingMarketAttributes = MarketRegistry[MarketType]['listingAttributes']
export type MonitorMarketFilters = MarketRegistry[MarketType]['monitorFilters']

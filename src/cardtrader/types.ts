import { ValueObject } from '@/common/utilities'
import { registerMarketFactory, type ListingMarketAttributes } from '@/core'

const CT_MARKET_ID = 'cardtrader'

declare module '@/core' {
  interface MarketRegistry {
    [CT_MARKET_ID]: {
      listingAttributes: CardTraderListingAttributes
      monitorFilters: CardTraderMonitorFilters
      monitorFiltersProps: CardTraderMonitorFiltersProps
    }
  }
}

export type CardTraderListingAttributes = Readonly<{
  market: typeof CT_MARKET_ID
  ctZero: boolean
}>

export class CardTraderMonitorFilters extends ValueObject<CardTraderMonitorFiltersProps> {
  get market() { return this.props.market }
  get ctZero() { return this.props.ctZero }

  isMatchedBy(attributes: ListingMarketAttributes): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return attributes.market === this.market
      && (this.ctZero === undefined || attributes.ctZero === this.ctZero)
  }
}

export type CardTraderMonitorFiltersProps = Readonly<{
  market: typeof CT_MARKET_ID
  ctZero?: boolean
}>

registerMarketFactory('cardtrader', 'monitorFilters', props => new CardTraderMonitorFilters(props))

// MARK: - External types

export const CT_MTG_GAME_ID = 1
export const CT_CONDITIONS = {
  NM: 'Near Mint',
  SP: 'Slightly Played',
  MP: 'Moderately Played',
  P: 'Played',
  PR: 'Poor',
} as const
export const CT_LANGUAGES = {
  EN: 'en',
  FR: 'fr',
  DE: 'de',
  IT: 'it',
  JP: 'jp',
  KR: 'kr',
  PT: 'pt',
  RU: 'ru',
  ES: 'es',
  ZH_CN: 'zh-CN',
  ZH_TW: 'zh-TW',
} as const

/** @see {@link https://www.cardtrader.com/en/docs/api/full/reference#expansions} */
export type CardTraderExpansion = Readonly<{
  id: number
  game_id: number
  code: string
  name: string
}>

/** @see {@link https://www.cardtrader.com/en/docs/api/full/reference#blueprints} */
export type CardTraderBlueprint = Readonly<{
  id: number
  name: string
  expansion_id: number
  fixed_properties: Readonly<{
    collector_number?: string
  }>
}>

/** @see {@link https://www.cardtrader.com/en/docs/api/full/reference#marketplace-products} */
export type CardTraderProduct = Readonly<{
  id: number
  blueprint_id: number
  name_en: string
  price: Readonly<{
    cents: number
  }>
  properties_hash: Readonly<{
    collector_number: string
    mtg_foil: boolean
    condition: CardTraderCondition
    mtg_language: CardTraderLanguage
  }>
  expansion: Readonly<{
    id: number
    code: string
    name_en: string
  }>
  user: Readonly<{
    username: string
    country_code: string
    can_sell_via_hub: boolean
  }>
}>

export type CardTraderCondition = typeof CT_CONDITIONS[keyof typeof CT_CONDITIONS]
export type CardTraderLanguage = typeof CT_LANGUAGES[keyof typeof CT_LANGUAGES]

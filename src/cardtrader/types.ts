const CT_MARKET_ID = 'cardtrader'

declare module '@/core' {
  interface MarketRegistry {
    [CT_MARKET_ID]: {
      listingAttributes: CardTraderListingAttributes
      monitorFilters: CardTraderMonitorFilters
    }
  }
}

export type CardTraderListingAttributes = Readonly<{
  market: typeof CT_MARKET_ID
  ctZero: boolean
}>

export type CardTraderMonitorFilters = Readonly<{
  market: typeof CT_MARKET_ID
  ctZero?: boolean
}>

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
  code: string
  name: string
}>

/** @see {@link https://www.cardtrader.com/en/docs/api/full/reference#blueprints} */
export type CardTraderBlueprint = Readonly<{
  id: number
  name: string
  expansion_id: number
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
  }>
}>

export type CardTraderCondition = typeof CT_CONDITIONS[keyof typeof CT_CONDITIONS]
export type CardTraderLanguage = typeof CT_LANGUAGES[keyof typeof CT_LANGUAGES]

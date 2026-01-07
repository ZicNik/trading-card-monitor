/** @see {@link https://scryfall.com/docs/api/cards} */
export type ScryfallCard = Readonly<{
  name: string
  image_uris: ImageUris
  set: string
  collector_number: string
}>

/** @see {@link https://scryfall.com/docs/api/images} */
export type ImageUris = Readonly<{
  small: string
  normal: string
}>

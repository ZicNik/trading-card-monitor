/** @see {@link https://scryfall.com/docs/api/cards} */
export type ScryfallCard = Readonly<{
  name: string
  set: string
  collector_number: string
  image_uris?: ImageUris
  card_faces?: readonly CardFace[]
}>

/** @see {@link https://scryfall.com/docs/api/cards#card-face-objects} */
export type CardFace = Readonly<{
  image_uris?: ImageUris
}>

/** @see {@link https://scryfall.com/docs/api/images} */
export type ImageUris = Readonly<{
  small: string
  normal: string
}>

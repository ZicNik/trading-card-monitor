import { type ActorSystemInfo } from 'xstate'

/**
 * Container for system-wide, non-serializable dependencies. Ideal for services and other shared utilities.
 *
 * This is defined as empty by design. Client code must extend it and add the desired properties.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation}.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BotEnvironment {}

declare module 'xstate' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ActorSystem<T extends ActorSystemInfo> {
    /** Before use, be extra sure about the correct initialisation and injection of the stored objects. */
    env: BotEnvironment
  }
}

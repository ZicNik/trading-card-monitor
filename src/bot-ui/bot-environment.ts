import type { ActorSystemInfo } from 'xstate'
import type { BotOutputPort } from './bot-output'

/**
 * Container for system-wide, non-serializable dependencies. Ideal for services and other shared utilities.
 *
 * Client code should extend it and add the application-specific dependencies.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation}.
 */
export interface BotEnvironment {
  outputPort: BotOutputPort
}

declare module 'xstate' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ActorSystem<T extends ActorSystemInfo> {
    /** Before use, be extra sure about the correct initialisation and injection of the stored objects. */
    env: BotEnvironment
  }
}

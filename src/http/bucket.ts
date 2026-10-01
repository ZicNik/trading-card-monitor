import { RateLimiter } from 'limiter'

export type BucketConfig = Readonly<{
  capacity: number
  interval: number
}>

/** Token bucket for rate limiting. */
export class Bucket {
  private readonly limiter: RateLimiter

  /**
   * @param capacity Initial and maximum amount of tokens.
   * @param interval Duration over which tokens are replenished, in milliseconds.
   */
  constructor({ capacity, interval }: BucketConfig) {
    this.limiter = new RateLimiter({ tokensPerInterval: capacity, interval })
  }

  /** Consumes a token, waiting until one is available if necessary. */
  async removeToken(): Promise<void> {
    await this.limiter.removeTokens(1)
  }
}

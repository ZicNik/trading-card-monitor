export interface Clock {
  /** @param timezone IANA timezone identifier. An appropriate default is used when omitted. */
  today(timezone?: string): Temporal.PlainDate
}

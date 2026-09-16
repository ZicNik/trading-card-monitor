import type { Clock } from '@/time'

export type ClockConfig = Readonly<{
  defaultTimezone: string
}>

export class SystemClock implements Clock {
  constructor(private readonly config: ClockConfig) {}

  today(timezone?: string): Temporal.PlainDate {
    return Temporal.Now.plainDateISO(timezone ?? this.config.defaultTimezone)
  }
}

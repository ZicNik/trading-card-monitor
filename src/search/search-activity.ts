declare module '@/user' {
  interface UserActivityRegistry {
    search: SearchActivity
  }
}

/** A user performing a card search. */
export type SearchActivity = Readonly<{
  type: 'search'
  session: SearchSession
}>

export class SearchSession {
  constructor(
    public readonly id: string = crypto.randomUUID(),
    public step: SearchStep = 'initiated',
  ) {}

  /** The next step in line, if any. Doesn't modify the current state. */
  nextStep(): SearchStep | undefined {
    return STEPS[STEPS.indexOf(this.step) + 1]
  }
}

const STEPS = ['initiated', 'completed'] as const
export type SearchStep = typeof STEPS[number]

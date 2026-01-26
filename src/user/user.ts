export class User {
  constructor(
    public readonly id: string,
    public currentActivity: UserActivity = { type: 'idle' },
  ) {}
}

// MARK: - Repository

export interface UserRepository {
  findById(id: string): User | undefined
  save(user: User): void
}

// MARK: - Activity

/** @see {@link UserActivityRegistry} */
export type UserActivity = UserActivityRegistry[keyof UserActivityRegistry]

/** Modules that add new activities are expected to extend this interface. In doing so, ensure that each activity has a `type` field with a unique string literal type. */
export interface UserActivityRegistry {
  idle: IdleActivity
}

/** A user not engaged in any activity. */
export type IdleActivity = Readonly<{ type: 'idle' }>

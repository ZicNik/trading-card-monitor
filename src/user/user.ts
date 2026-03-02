export class User {
  constructor(
    public readonly id: string,
  ) {}
}

// MARK: - Repository

export interface UserRepository {
  findById(id: string): User | undefined
  save(user: User): void
}

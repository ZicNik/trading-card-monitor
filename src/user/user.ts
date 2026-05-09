export class User {
  constructor(
    public readonly id: string,
  ) {}
}

// MARK: - Repository

export interface UserRepository {
  findById(id: string): Promise<User | undefined>
  save(user: User): Promise<void>
}

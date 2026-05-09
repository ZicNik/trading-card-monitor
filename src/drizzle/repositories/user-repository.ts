import { User, type UserRepository } from '@/user'
import { eq } from 'drizzle-orm'
import { DRIZZLE_DB } from '../db'
import { usersTable } from '../schema'

export class DbUserRepository implements UserRepository {
  async findById(id: string): Promise<User | undefined> {
    const user = (await DRIZZLE_DB.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1)
    )[0]
    return user === undefined
      ? undefined
      : new User(user.id)
  }

  async save(user: User): Promise<void> {
    await DRIZZLE_DB.insert(usersTable).values({ id: user.id })
  }
}

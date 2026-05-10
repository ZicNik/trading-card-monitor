import { User, type UserRepository } from './user'

export type UserRegistrationInput = Readonly<{
  id: string
}>

export class UserRegistrationUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: UserRegistrationInput) {
    if (await this.userRepository.findById(input.id) !== undefined)
      return
    await this.userRepository.save(new User(input.id))
  }
}

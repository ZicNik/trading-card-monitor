import type { UserRepository } from '@/core/user'
import { SearchSession } from './search-activity'

// MARK: - Use Case

export type SearchInitiatedInput = Readonly<{
  userId: string
}>

export type SearchInitiatedOutput = Readonly<{
  recipientId: string
}>

export interface SearchInitiatedOutputPort {
  present(output: SearchInitiatedOutput): void
}

/** Handles the initial intent to perform a card search, when the target is yet to be specified. */
export class SearchInitiatedUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly outputPort: SearchInitiatedOutputPort,
  ) {}

  execute(input: SearchInitiatedInput): void {
    const user = this.userRepo.findById(input.userId)
    if (user === undefined)
      return
    user.currentActivity = { type: 'search', session: new SearchSession() }
    this.userRepo.save(user)
    this.outputPort.present({ recipientId: input.userId })
  }
}

// MARK: - Presenter

export type SearchInitiatedViewModel = Readonly<{
  recipientId: string
}>

export interface SearchInitiatedView {
  render(vm: SearchInitiatedViewModel): void
}

export class SearchInitiatedPresenter implements SearchInitiatedOutputPort {
  constructor(private readonly view: SearchInitiatedView) {}

  present(output: SearchInitiatedOutput): void {
    this.view.render(output)
  }
}

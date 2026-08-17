import type { FuzzySearchRequestedOutput, FuzzySearchRequestedOutputPort } from '@/search'
import type { MessageViewModel } from '../views'

export type FuzzySearchState = FuzzySearchRequestedOutput
type FuzzySearchViewModel = MessageViewModel

export class FuzzySearchPresenter implements FuzzySearchRequestedOutputPort {
  state!: FuzzySearchState
  get vm(): FuzzySearchViewModel {
    return {
      text: `[${this.state.name}](${this.state.imgUrl})`,
      options: { formatting: 'markdown' },
    }
  }

  present(output: FuzzySearchRequestedOutput): void {
    this.state = output
  }
}

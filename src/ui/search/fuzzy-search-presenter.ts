import type { MessageViewModel } from '@/bot-ui/views'
import type { FuzzySearchRequestedOutput, FuzzySearchRequestedOutputPort } from '@/use-cases'

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

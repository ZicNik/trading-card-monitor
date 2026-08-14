import type { FuzzySearchRequestedOutput, FuzzySearchRequestedOutputPort } from '@/search'
import type { MessageOptions } from '../bot-output'

export type FuzzySearchState = FuzzySearchRequestedOutput

export type FuzzySearchViewModel = Readonly<{
  text: string
  options: MessageOptions
}>

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

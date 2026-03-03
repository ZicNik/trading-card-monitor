import type { SearchRequestedOutput, SearchRequestedOutputPort } from '@/search'
import type { SendMessageOptions } from '../bot-output'

export type SearchRequestedViewModel = Readonly<{
  text: string
  options: SendMessageOptions
}>

export class SearchRequestedPresenter implements SearchRequestedOutputPort {
  vm: SearchRequestedViewModel | undefined

  present(output: SearchRequestedOutput): void {
    this.vm = {
      text: `[${output.name}](${output.imgUrl})`,
      options: { formatting: 'markdown' },
    }
  }
}

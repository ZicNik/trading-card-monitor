import type { SearchRequestedOutput, SearchRequestedOutputPort } from '@/search'

export type SearchRequestedViewModel = Readonly<{
  text: string
}>

export class SearchRequestedPresenter implements SearchRequestedOutputPort {
  vm: SearchRequestedViewModel | undefined

  present(output: SearchRequestedOutput): void {
    this.vm = {
      text: `<a href="${output.imgUrl}">${output.name}</a>`,
    }
  }
}

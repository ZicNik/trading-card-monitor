import type { MessageViewModel } from '@/bot-ui/views'
import type { DeleteMonitorOutput, DeleteMonitorOutputPort } from '@/use-cases'

export type DeleteMonitorState = DeleteMonitorOutput
type DeleteMonitorViewModel = MessageViewModel

export class DeleteMonitorPresenter implements DeleteMonitorOutputPort {
  state!: DeleteMonitorState
  get vm(): DeleteMonitorViewModel {
    return {
      text: `The alert for <em>${this.state.cardName}</em> has been deleted.`,
      options: { formatting: 'html' },
    }
  }

  present(output: DeleteMonitorOutput): void {
    this.state = output
  }
}

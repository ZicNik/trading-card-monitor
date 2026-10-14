import type { CardMonitorRepository } from '@/core'

export type DeleteMonitorInput = Readonly<{
  id: number
}>

export type DeleteMonitorOutput = Readonly<{
  cardName: string
}>

export interface DeleteMonitorOutputPort {
  present(output: DeleteMonitorOutput): void
}

export class DeleteMonitorUseCase {
  constructor(
    private readonly outputPort: DeleteMonitorOutputPort,
    private readonly repo: CardMonitorRepository,
  ) {}

  async execute(input: DeleteMonitorInput): Promise<void> {
    const cardName = (await this.repo.findById(input.id))?.cardName
    if (cardName === undefined)
      throw new CardMonitorNotFoundError(input.id)
    await this.repo.delete(input.id)
    this.outputPort.present({ cardName })
  }
}

export class CardMonitorNotFoundError extends Error {
  constructor(readonly id: number) {
    super(`Monitor for id ${id} not found`)
    this.name = 'CardMonitorNotFoundError'
  }
}

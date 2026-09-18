export type GetActiveMonitorsQuery = Readonly<{
  userId: string
}>

export type MonitorRecap = Readonly<{}>

export type GetActiveMonitorsOuput = readonly MonitorRecap[]

export interface GetActiveMonitorsDataReader {
  read(query: GetActiveMonitorsQuery): Promise<GetActiveMonitorsOuput>
}

export interface GetActiveMonitorsOuputPort {
  present(output: GetActiveMonitorsOuput): void
}

export class GetActiveMonitorsUseCase {
  constructor(
    private readonly reader: GetActiveMonitorsDataReader,
    private readonly outputPort: GetActiveMonitorsOuputPort,
  ) {}

  async execute(query: GetActiveMonitorsQuery): Promise<void> {
    this.outputPort.present(await this.reader.read(query))
  }
}

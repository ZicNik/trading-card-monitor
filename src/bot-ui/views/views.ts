import { createActor, fromPromise, toPromise, type PromiseActorLogic } from 'xstate'

import type { BotEnvironment } from '../bot-environment'
import type { MessageInfo, MessageOptions } from '../output'

/** A view that is able to turn into actor logic for a state machine. */
export interface ActorView<Output, Input = unknown> {
  toActor(): PromiseActorLogic<Output, Input>
}

// MARK: - Message

export type MessageViewModel = Readonly<{
  text: string
  options?: MessageOptions
}>

export type MessageActorInput<Input = unknown> = { chatId: string } & Input

/** View representing a new chat message. */
export class Message<Input = unknown> implements ActorView<MessageInfo, MessageActorInput<Input>> {
  private constructor(
    private readonly viewmodelBuilder: ({ input, env }: { input: Input, env: BotEnvironment }) => MessageViewModel,
  ) {}

  static withText(text: string, options?: MessageOptions): Message {
    return new Message(() => ({ text, ...(options === undefined ? {} : { options }) }))
  }

  static withDynamicText<Input>(text: (input: Input) => string, options?: MessageOptions): Message<Input> {
    return new Message(({ input }) => ({ text: text(input), ...(options === undefined ? {} : { options }) }))
  }

  static withViewModel<Input>(viewmodelBuilder: ({ input, env }: { input: Input, env: BotEnvironment }) => MessageViewModel): Message<Input> {
    return new Message(viewmodelBuilder)
  }

  toActor(): PromiseActorLogic<MessageInfo, MessageActorInput<Input>> {
    return fromPromise(({ input, system }) => {
      const vm = this.viewmodelBuilder({ input, env: system.env })
      return system.env.outputPort.sendMessage(input.chatId, vm.text, vm.options)
    })
  }
}

// MARK: - EditedMessage

export type EditedMessageViewModel = MessageViewModel
export type EditedMessageActorInput<Input = unknown> = { messageId: string } & MessageActorInput<Input>

/** View representing an edited chat message. */
export class EditedMessage<Input = unknown> implements ActorView<void, EditedMessageActorInput<Input>> {
  private constructor(
    private readonly viewmodelBuilder: ({ input, env }: { input: Input, env: BotEnvironment }) => EditedMessageViewModel,
  ) {}

  static withText(text: string, options?: MessageOptions): EditedMessage {
    return new EditedMessage(() => ({ text, ...(options === undefined ? {} : { options }) }))
  }

  static withDynamicText<Input>(text: (input: Input) => string, options?: MessageOptions): EditedMessage<Input> {
    return new EditedMessage(({ input }) => ({ text: text(input), ...(options === undefined ? {} : { options }) }))
  }

  static withViewModel<Input>(viewmodelBuilder: ({ input, env }: { input: Input, env: BotEnvironment }) => EditedMessageViewModel): EditedMessage<Input> {
    return new EditedMessage(viewmodelBuilder)
  }

  toActor(): PromiseActorLogic<void, EditedMessageActorInput<Input>> {
    return fromPromise(({ input, system }) => {
      const vm = this.viewmodelBuilder({ input, env: system.env })
      return system.env.outputPort.editMessage(input.chatId, input.messageId, vm.text, vm.options)
    })
  }
}

// MARK: - CombinedView

type ViewsBuilder<Output, Input> = ({ input, env }: { input: Input, env: BotEnvironment }) => ActorView<Output, Input>[]

/** Render multiple views sequentially. */
export class CombinedView<Output, Input> implements ActorView<Output[], Input> {
  private constructor(
    private readonly builder: ViewsBuilder<Output, Input>,
  ) {}

  static from<Output, Input>(...views: ActorView<Output, Input>[]): CombinedView<Output, Input> {
    return new CombinedView(() => views)
  }

  static fromBuilder<Output, Input>(builder: ViewsBuilder<Output, Input>): CombinedView<Output, Input> {
    return new CombinedView(builder)
  }

  toActor(): PromiseActorLogic<Output[], Input> {
    return fromPromise(async ({ input, self }) => {
      const output: Output[] = []
      for (const view of this.builder({ input, env: self.system.env })) {
        const actor = createActor(view.toActor(), {
          input,
          parent: self,
        })
        actor.start()
        output.push(await toPromise(actor))
      }
      return output
    })
  }
}

import { fromPromise, type AnyActorLogic, type PromiseActorLogic } from 'xstate'
import type { BotEnvironment } from './bot-environment'
import type { MessageInfo, MessageOptions } from './bot-output'

/** A view that is able to turn into actor logic for a state machine. */
export interface ActorView<A extends AnyActorLogic> {
  toActor(): A
}

// MARK: - Message

type MessageViewActorInput<Input> = { chatId: string } & Input
type MessageViewModel = Readonly<{
  text: string
  options?: MessageOptions
}>

/** View representing a new chat message. */
export class Message<Input> implements ActorView<PromiseActorLogic<MessageInfo, MessageViewActorInput<Input>>> {
  private constructor(
    private readonly viewmodelBuilder: ({ input, env }: { input: Input, env: BotEnvironment }) => MessageViewModel,
  ) {}

  static withText(text: string, options?: MessageOptions): Message<unknown> {
    return new Message(() => ({ text, ...(options === undefined ? {} : { options }) }))
  }

  static withDynamicText<Input>(text: (input: Input) => string, options?: MessageOptions): Message<Input> {
    return new Message(({ input }) => ({ text: text(input), ...(options === undefined ? {} : { options }) }))
  }

  static withViewModel<Input>(viewmodelBuilder: ({ input, env }: { input: Input, env: BotEnvironment }) => MessageViewModel): Message<Input> {
    return new Message(viewmodelBuilder)
  }

  toActor(): PromiseActorLogic<MessageInfo, MessageViewActorInput<Input>> {
    return fromPromise(({ input, system }) => {
      const vm = this.viewmodelBuilder({ input, env: system.env })
      return system.env.outputPort.sendMessage(input.chatId, vm.text, vm.options)
    })
  }
}

// MARK: - EditedMessage

type EditedMessageViewActorInput<Input> = { messageId: string } & MessageViewActorInput<Input>
type EditedMessageViewModel = MessageViewModel

/** View representing an edited chat message. */
export class EditedMessage<Input> implements ActorView<PromiseActorLogic<void, EditedMessageViewActorInput<Input>>> {
  private constructor(
    private readonly viewmodelBuilder: ({ input, env }: { input: Input, env: BotEnvironment }) => EditedMessageViewModel,
  ) {}

  static withText(text: string, options?: MessageOptions): EditedMessage<unknown> {
    return new EditedMessage(() => ({ text, ...(options === undefined ? {} : { options }) }))
  }

  static withDynamicText<Input>(text: (input: Input) => string, options?: MessageOptions): EditedMessage<Input> {
    return new EditedMessage(({ input }) => ({ text: text(input), ...(options === undefined ? {} : { options }) }))
  }

  static withViewModel<Input>(viewmodelBuilder: ({ input, env }: { input: Input, env: BotEnvironment }) => EditedMessageViewModel): EditedMessage<Input> {
    return new EditedMessage(viewmodelBuilder)
  }

  toActor(): PromiseActorLogic<void, EditedMessageViewActorInput<Input>> {
    return fromPromise(({ input, system }) => {
      const vm = this.viewmodelBuilder({ input, env: system.env })
      return system.env.outputPort.editMessage(input.chatId, input.messageId, vm.text, vm.options)
    })
  }
}

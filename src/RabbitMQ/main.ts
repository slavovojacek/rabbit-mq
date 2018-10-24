import { isMissing, isPositiveInteger, isPresent } from "@usefultools/utils"
import { ConfirmChannel, connect, Connection, Message, Options, Replies } from "amqplib"
import { ExchangeType, Opts } from "./types"

class RabbitMQ {
  private connection: Connection | null
  private channel: ConfirmChannel | null
  private options: Options.Connect & Opts
  private initConnection: typeof connect

  constructor(options: Options.Connect & Opts, initConnection: typeof connect = connect) {
    this.connection = null
    this.channel = null
    this.options = options
    this.initConnection = initConnection

    // this.init()
  }

  getChannelOrFail = async (): Promise<ConfirmChannel> => {
    const channel = await this.init()

    if (isMissing(channel)) {
      throw new ReferenceError("No channel is established")
    } else {
      return channel
    }
  }

  assertQueue = async (
    name: string,
    opts?: Options.AssertQueue,
  ): Promise<Replies.AssertQueue> => {
    const channel = await this.getChannelOrFail()

    return channel.assertQueue(name, opts)
  }

  assertExchange = async (
    name: string,
    type: ExchangeType,
    opts?: Options.AssertExchange,
  ): Promise<Replies.AssertExchange> => {
    const channel = await this.getChannelOrFail()

    return channel.assertExchange(name, type, opts)
  }

  publishOnTopicExchange = async (
    exchangeName: string,
    routingKey: string,
    message: string,
    opts?: Options.Publish,
  ): Promise<Buffer> => {
    const channel = await this.getChannelOrFail()

    return new Promise(async (resolve, reject) => {
      await this.assertExchange(exchangeName, "topic", { durable: true })

      const options = {
        appId: this.options.appId,
        timestamp: Date.now(),
        persistent: true,
        ...opts,
      }

      const msg = Buffer.from(message)

      channel.publish(
        exchangeName,
        routingKey,
        msg,
        options,
        (err: Error, _ok: Replies.Empty): void =>
          isPresent(err) ? reject(err) : resolve(msg),
      )
    }) as Promise<Buffer>
  }

  subscribe = async (
    queueName: string,
    onReceive: (msg: Message, channel: ConfirmChannel) => void,
    opts?: Options.Consume,
    prefetch: number = 1,
  ): Promise<Replies.Consume> => {
    const channel = await this.getChannelOrFail()

    await this.assertQueue(queueName, { durable: true })

    if (isPositiveInteger(prefetch)) {
      await channel.prefetch(prefetch)
    }

    return channel.consume(
      queueName,
      (msg: Message | null) => {
        if (!isMissing(msg)) {
          onReceive(msg, channel)
        }
      },
      opts,
    )
  }

  init = async (): Promise<ConfirmChannel | null> => {
    const {
      initConnection,
      options: { url, onConnectionError, onConnectionClose, appId, ...opts },
    } = this

    if (isMissing(this.connection) || isMissing(this.channel)) {
      try {
        this.connection = await initConnection(url, opts)

        this.connection.on("error", onConnectionError)
        this.connection.on("close", onConnectionClose)

        this.channel = await this.connection.createConfirmChannel()
      } catch (err) {
        onConnectionError(err)

        this.channel = null
      }
    }

    return this.channel
  }
}

export default RabbitMQ

import { isFunction, isMissing, isPositiveInteger, isPresent } from "@usefultools/utils"
import { ConfirmChannel, connect, Connection, Message, Options, Replies } from "amqplib"
import { ExchangeType, Opts } from "./types"

class RabbitMq {
  private connection: Connection | null
  private channel: ConfirmChannel | null
  private options: Options.Connect & Opts
  private initConnection: typeof connect

  constructor(options: Options.Connect & Opts, initConnection: typeof connect = connect) {
    this.connection = null
    this.channel = null
    this.options = options
    this.initConnection = initConnection
  }

  getChannelOrFail = async (): Promise<ConfirmChannel> => {
    const channel = await this.assertChannel()

    if (isMissing(channel)) {
      throw new ReferenceError("No channel is established")
    } else {
      return channel
    }
  }

  assertExchange = async (
    name: string,
    type: ExchangeType,
    opts?: Options.AssertExchange,
  ): Promise<Replies.AssertExchange> => {
    const channel = await this.getChannelOrFail()

    return channel.assertExchange(name, type, opts)
  }

  assertQueue = async (
    name: string,
    opts?: Options.AssertQueue,
  ): Promise<Replies.AssertQueue> => {
    const channel = await this.getChannelOrFail()

    return channel.assertQueue(name, opts)
  }

  bindQueue = async (
    queueName: string,
    exchangeName: string,
    pattern: string,
  ): Promise<Replies.Empty> => {
    const channel = await this.getChannelOrFail()

    return channel.bindQueue(queueName, exchangeName, pattern)
  }

  publish = async (
    exchangeName: string,
    routingKey: string,
    message: string,
    opts?: Options.Publish,
  ): Promise<Buffer> => {
    const channel = await this.getChannelOrFail()

    return new Promise(async (resolve, reject) => {
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

  assertChannel = async (): Promise<ConfirmChannel> => {
    const {
      initConnection,
      options: {
        attemptReconnectAfterMs,
        url,
        onConnectionError,
        onConnectionClose,
        appId: _appId,
        ...opts
      },
    } = this

    if (isMissing(this.connection) || isMissing(this.channel)) {
      const timeout = isPositiveInteger(attemptReconnectAfterMs)
        ? attemptReconnectAfterMs
        : 2500

      this.connection = await initConnection(url, opts)

      this.connection.on("error", (error: Error) => {
        setTimeout(this.assertChannel, timeout)

        if (isFunction(onConnectionError)) {
          onConnectionError(error)
        }
      })

      this.connection.on("close", () => {
        setTimeout(this.assertChannel, timeout)

        if (isFunction(onConnectionClose)) {
          onConnectionClose()
        }
      })

      this.channel = await this.connection.createConfirmChannel()
    }

    return this.channel
  }
}

export default RabbitMq

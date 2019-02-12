import {
  isFunction,
  isMissing,
  isPositiveInteger,
  isPresent,
  noop,
} from "@usefultools/utils"
import { ConfirmChannel, connect, Connection, Message, Options, Replies } from "amqplib"
import { ExchangeType, RabbitMqInitOpts } from "./types"

class RabbitMq {
  private connection: Connection | null
  private channel: ConfirmChannel | null
  private options: Options.Connect & RabbitMqInitOpts
  private initConnection: typeof connect

  constructor(
    options: Options.Connect & RabbitMqInitOpts,
    initConnection: typeof connect = connect,
  ) {
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

  assertChannel = async (): Promise<ConfirmChannel | null> => {
    const {
      initConnection,
      options: {
        attemptReconnectAfterMs,
        url,
        onConnectionError = noop,
        onConnectionClose,
        appId: _appId,
        name,
        log,
        ...opts
      },
    } = this

    if (isMissing(this.connection) || isMissing(this.channel)) {
      const timeoutMs = isPositiveInteger(attemptReconnectAfterMs)
        ? attemptReconnectAfterMs
        : 2500

      try {
        this.connection = await initConnection(url, opts)

        this.connection.on("error", onConnectionError)

        this.connection.on("close", () => {
          this.connection = null
          this.channel = null

          setTimeout(() => this.assertChannel, timeoutMs)

          if (isFunction(onConnectionClose)) {
            onConnectionClose()
          }
        })

        this.channel = await this.connection.createConfirmChannel()

        log.info(`✅ Channel for ${name} established, type: Confirm...`)
      } catch (error) {
        this.connection = null
        this.channel = null

        log.error(`😢 Failed to establish channel for ${name}, retrying...`, error)

        return new Promise((resolve) => {
          setTimeout(() => resolve(this.assertChannel()), timeoutMs)
        })
      }
    }

    return this.channel
  }

  closeConnection = async (): Promise<boolean> => {
    if (isMissing(this.connection) || isMissing(this.channel)) {
      return true
    } else {
      try {
        await this.channel.close()
        await this.connection.close()

        return true
      } catch (error) {
        this.options.log.error("😢 Failed to close connection...", error)
        return false
      }
    }
  }
}

export default RabbitMq

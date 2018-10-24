import { connect, Options } from "amqplib"
import RabbitMq from "./main"
import { Opts } from "./types"

describe("RabbitMq", () => {
  const self: {
    opts: Options.Connect & Opts
    initConnection: typeof connect
  } = {
    opts: null!,
    initConnection: null!,
  }

  beforeEach(() => {
    self.opts = {
      url: "amqp://user:password@host/vhost",
      onConnectionError: jest.fn(),
      onConnectionClose: jest.fn(),
      appId: "test",
    }
    self.initConnection = jest.fn()
  })

  afterEach(() => {
    self.opts = null!
    self.initConnection = null!
  })

  describe("constructor", () => {
    it("correctly creates the connection and the channel", async () => {
      const connection = {
        on: jest.fn(),
        createConfirmChannel: jest.fn(() => Promise.resolve("ConfirmChannel")),
      }

      Object.assign(self.opts, { heartbeat: 60 })
      self.initConnection = jest.fn(() => Promise.resolve(connection))

      const { opts, initConnection } = self

      const rabbitMq = new RabbitMq(opts, initConnection)
      const channel = await rabbitMq.init()

      expect(initConnection).toHaveBeenCalledWith(opts.url, { heartbeat: 60 })

      expect(channel).toEqual("ConfirmChannel")

      const [onConnError, onConnClose] = connection.on.mock.calls

      expect(onConnError).toEqual(["error", opts.onConnectionError])
      expect(onConnClose).toEqual(["close", opts.onConnectionClose])
    })
  })
})

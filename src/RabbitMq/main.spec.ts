import { connect, Options } from "amqplib"
import RabbitMq from "./main"
import { RabbitMqInitOpts } from "./types"

describe("RabbitMq", () => {
  const self: {
    opts: Options.Connect & RabbitMqInitOpts
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
      name: "test-client",
      log: {
        info: (_msg: string) => null,
        error: (_msg: string) => null,
      },
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

      Object.assign(self, {
        initConnection: jest.fn(() => Promise.resolve(connection)),
        opts: {
          ...self.opts,
          heartbeat: 60,
        },
      })

      const { opts, initConnection } = self

      const rabbitMq = new RabbitMq(opts, initConnection)
      const channel = await rabbitMq.assertChannel()

      expect(initConnection).toHaveBeenCalledWith(opts.url, { heartbeat: 60 })
      expect(channel).toEqual("ConfirmChannel")
    })
  })
})

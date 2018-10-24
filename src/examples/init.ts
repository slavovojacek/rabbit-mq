import { RabbitMq } from "../RabbitMQ"

export default new RabbitMq({
  url: "amqp://user:password@host/vhost",
  onConnectionError: (err) => {
    // tslint:disable-next-line:no-console
    console.log(`ERROR: ${err}`)
  },
  onConnectionClose: () => {
    // tslint:disable-next-line:no-console
    console.log("CONNECTION CLOSED")
  },
  appId: "my-test-app",
})

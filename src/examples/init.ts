import { RabbitMQ } from "../RabbitMQ"

export default new RabbitMQ({
  url: "",
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

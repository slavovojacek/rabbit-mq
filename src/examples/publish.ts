import client from "./init"
import { Exchange } from "./types"

const messages = [
  { routingKey: "log.critical", msg: "Kernel Error" },
  { routingKey: "log.info", msg: "Rabbit running OK" },
  { routingKey: "log.info", msg: "Received Update #1" },
  { routingKey: "log.critical", msg: "Reference Error" },
  { routingKey: "log.info", msg: "Mongo running OK" },
  { routingKey: "log.info", msg: "Received Update #2" },
  { routingKey: "log.info", msg: "Received Update #3" },
  { routingKey: "log.info", msg: "Redis running OK" },
]

const publish = messages.map(({ routingKey, msg }) =>
  client.publishOnTopicExchange(Exchange.Logs, routingKey, msg, {
    type: "task_to_process",
  }),
)

Promise.all(publish)
  // tslint:disable-next-line:no-console
  .then(console.log)
  .then(() => process.exit(0))

import { ConfirmChannel, Message } from "amqplib"
import client from "./init"
import { Queue } from "./types"

function onReceive(msg: Message, channel: ConfirmChannel): void {
  setTimeout(() => {
    // tslint:disable-next-line:no-console
    console.log(`Received: ${msg.content.toString()}`)
    channel.ack(msg)
  }, 1500)
}

client.subscribe(Queue.LogsCritical, onReceive).then(() => {
  // tslint:disable-next-line:no-console
  console.log("Waiting for messages...")
})

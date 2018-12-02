[![CircleCI](https://circleci.com/gh/litchi-io/rabbit-mq.svg?style=svg)](https://circleci.com/gh/litchi-io/rabbit-mq)
[![codecov](https://codecov.io/gh/litchi-io/rabbit-mq/branch/master/graph/badge.svg)](https://codecov.io/gh/litchi-io/rabbit-mq)
[![npm version](https://img.shields.io/npm/v/@usefultools/rabbit-mq.svg)](https://www.npmjs.com/package/@usefultools/rabbit-mq)
[![GuardRails badge](https://badges.production.guardrails.io/litchi-io/rabbit-mq.svg)](https://www.guardrails.io)
[![Security Responsible Disclosure](https://img.shields.io/badge/Security-Responsible%20Disclosure-yellow.svg)](https://github.com/litchi-io/rabbit-mq/blob/master/SECURITY.md)

# RabbitMq

A RabbitMq client that's just betterer.

## Prereqs & Install

* Node >=9.10.0
* npm >=6.1.0

Please note that the **TypeScript target is ES6**.

```sh
npm install @usefultools/rabbit-mq
npm install @types/amqplib --save-dev # for TypeScript projects
```

## Usage

### 1) Create a Subscriber ⬇️

```typescript
const subscriber = new RabbitMq({
  url,
  onConnectionError: (err: Error) => log.error("Subscriber error", err.stack),
  onConnectionClose: () => log.error("Subscriber connection closed"),
  appId,
  heartbeat: 15,
})

async function setupSubsriber(): Promise<RabbitMq> {
  return getSubscriber()
}

async function getSubscriber(): Promise<RabbitMq> {
  await subscriber.assertChannel()
  return subscriber
}

export { getSubscriber, setupSubsriber }

```

### 2) Create a Publisher ⬆️

```typescript
const publisher = new RabbitMq({
  url,
  onConnectionError: (err: Error) => log.error("Publisher error", err.stack),
  onConnectionClose: () => log.error("Publisher connection closed"),
  appId,
  heartbeat: 15,
})

async function setupPublisher(): Promise<Array<Replies.Empty>> {
  const opts = {
    exchange: "logs",
    type: ExchangeType.Topic,
    bindings: [
      { queue: "logs_critical", routingKey: "*.critical", dlq: "dead_letter_queue", isDurable: true },
      { queue: "logs_all", routingKey: "#", dlq: "dead_letter_queue", isDurable: true },
    ],
  }

  await publisher.assertExchange(opts.exchange, opts.type, { durable: true })

  const bindings = opts.bindings.map(async ({ queue, routingKey, dlq, isDurable }) => {
    await publisher.assertQueue(queue, {
      durable: isDurable,
      arguments: {
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": dlq,
      },
    })

    return publisher.bindQueue(queue, opts.exchange, routingKey)
  })

  return Promise.all(bindings)
}

async function getPublisher(): Promise<RabbitMq> {
  await publisher.assertChannel()
  return publisher
}

export { setupPublisher, getPublisher }

```

### 3) Set up both the publisher and the subscriber upon service start 🔌

```typescript
async function init(workerId: number = 0): Promise<void | never> {
  try {
    log.info(`${workerId} :: Initialising ${appId} ...`)

    await Promise.all([setupSubsriber(), setupPublisher()])
    await receive()

    log.info(`${workerId} :: ${appId} Running ...`)
  } catch (err) {
    log.error(`Could not initialise ${appId}`, err.stack)
    process.exit(1)
  }
}

```

### 4) Receive and process messages 😎

```typescript
async function receive(): Promise<void> {
  const subscriber = await getSubscriber()
  const publisher = await getPublisher()

  subscriber.subscribe("requests", (msg: Message, channel: ConfirmChannel) => {
    const ctx = buildContext(msg, publisher)

    switch (msg.properties.type) {
      case "request_foo":
        return onRequestFoo(msg, channel, ctx)
      case "request_bar":
        return onRequestBar(msg, channel, ctx)
      default:
        // do not requeue, this will go straight to dlq
        return channel.reject(msg, false)
    }
  })
}

```

## Contributing

If you have comments, complaints, or ideas for improvements, feel free to open an issue or a pull request! See [Contributing guide](./CONTRIBUTING.md) for details about project setup, testing, etc.

## Author and license

This library was created by [@LITCHI.IO](https://github.com/litchi-io). Main author and maintainer is [Slavo Vojacek](https://github.com/slavovojacek).

Contributors: [Slavo Vojacek](https://github.com/slavovojacek)

`@usefultools/rabbit-mq` is available under the ISC license. See the [LICENSE file](./LICENSE.txt) for more info.

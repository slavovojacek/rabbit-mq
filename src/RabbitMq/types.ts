export interface RabbitMqInitOpts {
  url: string
  onConnectionError?: (err: Error) => void
  onConnectionClose?: () => void
  name: string
  attemptReconnectAfterMs?: number
  appId: string
  log: {
    info: (...args: Array<any>) => any
    error: (...args: Array<any>) => any
  }
}

export enum ExchangeType {
  Direct = "direct",
  Fanout = "fanout",
  Headers = "headers",
  Topic = "topic",
}

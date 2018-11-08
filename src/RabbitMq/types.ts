export interface Opts {
  url: string
  onConnectionError?: (err: Error) => void
  onConnectionClose?: () => void
  attemptReconnectAfterMs?: number
  appId: string
}

export enum ExchangeType {
  Direct = "direct",
  Fanout = "fanout",
  Headers = "headers",
  Topic = "topic",
}

export interface Opts {
  url: string
  onConnectionError: (err: Error) => void
  onConnectionClose: () => void
  appId: string
}

export type ExchangeType = "direct" | "fanout" | "headers" | "topic"

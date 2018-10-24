export enum Exchange {
  Logs = "logs",
}

export enum Queue {
  LogsAll = "logs_all",
  LogsCritical = "logs_critical",
}

export enum RoutingKey {
  LogsAll = "#",
  LogsCritical = "*.critical",
}

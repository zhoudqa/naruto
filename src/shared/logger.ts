import { appendFileSync } from "node:fs"

const LOG_PATH = "/tmp/naruto.log"

function formatTimestamp(): string {
  return new Date().toISOString()
}

export function log(message: string, data?: unknown): void {
  const timestamp = formatTimestamp()
  const line = data
    ? `[${timestamp}] ${message} ${JSON.stringify(data)}\n`
    : `[${timestamp}] ${message}\n`
  appendFileSync(LOG_PATH, line)
}

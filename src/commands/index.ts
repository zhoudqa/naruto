import type { NarutoCommand } from "./types.js"
import { developCommand } from "./develop.js"
import { prdCommand } from "./prd.js"
import { techDesignCommand } from "./tech-design.js"
import { codeCommand } from "./code.js"
import { testCommand } from "./test.js"
import { reviewCommand } from "./review.js"
import { narutoExportCommand } from "./naruto-export.js"

export type { NarutoCommand } from "./types.js"

export const COMMANDS: Readonly<Record<string, NarutoCommand>> = {
  "develop": developCommand,
  "prd": prdCommand,
  "tech-design": techDesignCommand,
  "code": codeCommand,
  "test": testCommand,
  "review": reviewCommand,
  "naruto-export": narutoExportCommand,
}

const COMMAND_NAMES = new Set(Object.keys(COMMANDS))

export function isNarutoCommand(name: string): boolean {
  return COMMAND_NAMES.has(name)
}

export function getCommand(name: string): NarutoCommand | undefined {
  return COMMANDS[name]
}

export function expandCommandTemplate(
  name: string,
  args: string,
): string | undefined {
  const command = COMMANDS[name]
  if (!command) return undefined
  return command.expand(args)
}

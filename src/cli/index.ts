import { defineCommand, runMain, renderUsage } from 'citty'
import type { ArgsDef, CommandDef } from 'citty'
import colors from 'picocolors'
import { createConsola } from 'consola'

import { version as rajtVersion } from '../../package.json'

import logger, { type ILogger } from '../utils/logger'

import dev from './commands/dev'

// Prevent non-internal logs
(globalThis as any).logger = logger // Make it global in Node.js and browser
declare global { var logger: ILogger }

// console.log = () => {}
console.info = () => {}
console.warn = () => {}
console.error = () => {}

/**
 * The main entrypoint for the CLI.
 * main only gets called when the script is run directly, not when it's imported as a module.
 */
const directly = () => {
  try {
    // @ts-ignore
		return typeof vitest == 'undefined'
			&& (
				![typeof require, typeof module].includes('undefined') && require.main == module
				|| import.meta.url == `file://${process.argv[1]}`
			)
	} catch {
		return false
	}
}

const name = 'Rajt CLI'
const version = [name, colors.isColorSupported ? colors.gray('v'+rajtVersion) : rajtVersion].join(' ')

if (directly()) {
  const _args = process.argv.slice(2)
  if (_args.length == 1 && ['-v', '--version', '--v', '-version'].includes(_args[0])) {
    console.log(version)
    process.exit(0)
  }

  const consola = createConsola({ formatOptions: {date: false} })
  async function showUsage<T extends ArgsDef = ArgsDef>(cmd: CommandDef<T>, parent?: CommandDef<T>) {
    try {
      consola.log((await renderUsage(cmd, parent)).split('\n').slice(1).join('\n') + '\n')
    } catch (error) {
      consola.error(error)
    }
  }

  const main = defineCommand({
    meta: {
      name: 'rajt',
      version: rajtVersion,
      description: name,
    },
    subCommands: {
      dev,
    },
  })

  runMain(main, { rawArgs: _args?.length ? undefined : ['-h'], showUsage })
}

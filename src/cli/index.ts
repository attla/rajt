import { defineCommand, runMain, renderUsage } from 'citty'
import type { ArgsDef, CommandDef } from 'citty'
import colors from 'picocolors'
import { createConsola } from 'consola'

import { version as rajtVersion } from '../../package.json'

import { logo } from '../utils/log'

import dev from './commands/dev'
import build from './commands/build'
import deploy from './commands/deploy'

/**
 * The main entrypoint for the CLI.
 * main only gets called when the script is run directly, not when it's imported as a module.
 */
const directly = () => {
  try {
    // @ts-ignore
    return typeof vitest == 'undefined'
      && import.meta.url == `file://${process.argv[1]}`
	} catch {
		return false
	}
}

const name = 'Rajt CLI'
const version = [name, colors.isColorSupported ? colors.gray('v'+rajtVersion) : rajtVersion].join(' ')

if (directly()) {
  const _args = process.argv.slice(2)
  const _aLength = _args.length
  if (!_aLength || (_aLength == 1 && ['-v', '--version', '--v', '-version'].includes(_args[0]))) {
    console.log(version)
    process.exit(0)
  }

  console.log(`\n${logo} ${version}\n`)

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
      build,
      deploy,
    },
  })

  runMain(main, { rawArgs: _args?.length ? undefined : ['-h'], showUsage })
}

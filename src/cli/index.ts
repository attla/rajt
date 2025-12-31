import chalk from 'chalk'

// Prevent non-internal logs
const _console = {...console}
const logger = {
	step(...args: unknown[]) {
		if (args?.length && args.length < 2) return _console.log(chalk.blue('⁕') +` ${args[0]}\n`)
		const length = args.length - 1
		args.forEach((arg, index) => {
				switch (index) {
					case 0: return _console.log(chalk.blue('⁕') +' '+ arg)
					// case 0: return _console.log(chalk.blue('⁕') +` ${arg} \n`)
					case length: return _console.log(`   ${chalk.gray('⁕')} ${arg}\n`)
					default: _console.log(`   ${chalk.gray('⁕')} `+ arg)
				}
    })
	},
	substep(...args: unknown[]) {
		args.forEach(arg => _console.log(`   ${chalk.gray('⁕')} ` + arg))
	},
	ln() {
		_console.log('\n')
	},
  log(...args: unknown[]) {
    _console.log(...args)
  },
  info(...args: unknown[]) {
    _console.info(...args)
  },
  warn(...args: unknown[]) {
    _console.warn(...args)
  },
  error(...args: unknown[]) {
    _console.error(...args)
  },
} as const

// Torna global no Node.js e navegador
(globalThis as any).logger = logger

// Opcional: declaração de tipo para TypeScript
declare global {
  var logger: typeof logger
}

// console.log = () => {}
console.info = () => {}
console.warn = () => {}
console.error = () => {}

import process from 'node:process'
import { hideBin } from 'yargs/helpers'

import main from './main'


/**
 * The main entrypoint for the CLI.
 * main only gets called when the script is run directly, not when it's imported as a module.
 */
const directly = () => {
	try {
		return typeof vitest == 'undefined'
			&& (
				![typeof require, typeof module].includes('undefined') && require.main == module
				|| import.meta.url == `file://${process.argv[1]}`
			)
	} catch {
		return false
	}
}

if (directly()) {
	main(hideBin(process.argv))
		.catch(e => {
		// The logging of any error that was thrown from `main()` is handled in the `yargs.fail()` handler.
		// Here we just want to ensure that the process exits with a non-zero code.
		// We don't want to do this inside the `main()` function, since that would kill the process when running our tests.
		process.exit(e?.code || 1)
	})
}
